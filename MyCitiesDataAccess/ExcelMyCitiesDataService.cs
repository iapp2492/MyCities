using ClosedXML.Excel;
using Microsoft.Extensions.Logging;
using MyCitiesDataAccess.Dtos;
using System.Diagnostics;
using System.Globalization;

namespace MyCitiesDataAccess
{
    public class ExcelMyCitiesDataService : IMyCitiesDataService
    {
        #region Fields


        private readonly ILogger<ExcelMyCitiesDataService> _logger;
        private readonly string _excelPath;
        private readonly string _worksheetName;

        private readonly SemaphoreSlim _lock = new(1, 1);
        private List<MyCityDto>? _cache;
        private DateTime _lastWriteUtc; // This becomes relevant if the data file is modified during a user's session


        #endregion

        #region Constructors

        public ExcelMyCitiesDataService(string excelPath, string worksheetName, ILogger<ExcelMyCitiesDataService> logger)
        {
            _logger = logger;
            _excelPath = excelPath;
            _worksheetName = worksheetName;
        }


        #endregion

        #region Public API


        public async Task<IReadOnlyList<MyCityDto>> GetAllCitiesAsync()
        {
            await EnsureLoadedAsync();
            return _cache!;
        }

        public async Task ReloadAsync()
        {
            await _lock.WaitAsync();
            try
            {
                _cache = LoadFromExcel();
                _lastWriteUtc = File.GetLastWriteTimeUtc(_excelPath);
                _logger.LogInformation("MyCities Excel reloaded from {FilePath}. Rows: {RowCount}",  _excelPath, _cache.Count);
            }
            finally
            {
                _lock.Release();
            }
        }

        // Check the cache for data and if empty load the data from the Excel file
        private async Task EnsureLoadedAsync()
        {
            var path = _excelPath;
            if (string.IsNullOrWhiteSpace(path))
                throw new InvalidOperationException("ExcelFilePath is not configured.");

            if (!File.Exists(path))
                throw new FileNotFoundException("MyCitiesData.xlsx not found.", path);

            var writeUtc = File.GetLastWriteTimeUtc(path);

            // Quick check without lock (fast path)
            if (_cache != null && writeUtc == _lastWriteUtc)
                return;

            await _lock.WaitAsync();
            try
            {
                // Re-check inside lock
                writeUtc = File.GetLastWriteTimeUtc(path);
                if (_cache != null && writeUtc == _lastWriteUtc)
                    return;

                var sw = Stopwatch.StartNew();
                _cache = LoadFromExcel();
                sw.Stop();

                _lastWriteUtc = writeUtc;

                _logger.LogInformation("MyCities Excel loaded from {FilePath} in {ElapsedMs} ms.  Rows: {RowCount}", _excelPath, sw.ElapsedMilliseconds, _cache.Count);
            }
            finally
            {
                _lock.Release();
            }
        }

        private List<MyCityDto> LoadFromExcel()
        {
            try
            {
                var path = _excelPath;

                using var wb = new XLWorkbook(path);
                if (!wb.Worksheets.TryGetWorksheet(_worksheetName, out var ws))
                {
                    throw new InvalidOperationException($"Worksheet '{_worksheetName}' not found in '{path}'.");
                }

                // 1) Find the header row by searching for required header names
                var requiredHeaders = new[] { "City", "Country", "Region", "Lat", "Lon", "StayDuration", "Decades", "Notes" };

                int headerRow = FindHeaderRow(ws, requiredHeaders, searchTopRows: 30);
                if (headerRow == -1)
                    throw new InvalidOperationException($"Could not find header row containing: {string.Join(", ", requiredHeaders)}");

                // 2) Map header names -> column numbers (handles headers starting at column B, etc.)
                var colMap = GetHeaderColumnMap(ws, headerRow);

                // Validate required columns 
                foreach (var h in requiredHeaders)
                {
                    if (!colMap.ContainsKey(h))
                        throw new InvalidOperationException($"Missing required header '{h}' on row {headerRow}.");
                }

                // 3) Determine last used row and start reading AFTER header.
                // My data begins on row 4, but we’ll just skip blank rows until we hit a City value.
                int lastRow = ws.LastRowUsed()?.RowNumber() ?? headerRow;

                var result = new List<MyCityDto>();
                int id = 1;

                bool started = false;

                for (int row = headerRow + 1; row <= lastRow; row++)
                {
                    var city = GetTrimmed(ws, row, colMap["City"]);

                    // Skip blank rows BEFORE we start (this covers the "data begins row 4" situation)
                    if (!started && string.IsNullOrWhiteSpace(city))
                        continue;

                    // Once we’ve started, a blank City means “end of data”
                    if (started && string.IsNullOrWhiteSpace(city))
                        break;

                    started = true;

                    var country = GetTrimmed(ws, row, colMap["Country"]);
                    var region = GetTrimmed(ws, row, colMap["Region"]);

                    // Lat/Lon might be stored as number; try numeric first, then string parse
                    double lat = GetDouble(ws, row, colMap["Lat"], "Lat");
                    double lon = GetDouble(ws, row, colMap["Lon"], "Lon");

                    var stayDuration = GetTrimmed(ws, row, colMap["StayDuration"]);
                    var decades = GetTrimmed(ws, row, colMap["Decades"]);

                    string? notes = colMap.ContainsKey("Notes")
                        ? NullIfBlank(GetTrimmed(ws, row, colMap["Notes"]))
                        : null;

                    result.Add(new MyCityDto
                    {
                        Id = id++,
                        City = city!,
                        Country = country!,
                        Region = region!,
                        Lat = lat,
                        Lon = lon,
                        StayDuration = stayDuration!,
                        Decades = decades!,
                        Notes = notes
                    });
                }

                return result;

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in LoadFromExcel().");
                throw;
            }
        }

        private int FindHeaderRow(IXLWorksheet ws, string[] requiredHeaders, int searchTopRows)
        {
            try
            {
                // Look at first N rows; find a row that contains several of the required header strings
                // This handles my case where headers start in row 2 at column B where row 1 and column A are blank.
                int lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 1;

                for (int row = 1; row <= searchTopRows; row++)
                {
                    int matches = 0;

                    for (int column = 1; column <= lastCol; column++)
                    {
                        var text = ws.Cell(row, column).GetString().Trim();
                        if (requiredHeaders.Any(h => string.Equals(h, text, StringComparison.OrdinalIgnoreCase)))
                            matches++;
                    }

                    // 5+ usually means "we have found the header row"
                    if (matches >= 5)
                        return row;
                }

                return -1;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in LoadFromExcel().");
                throw;
            }
        }

        private Dictionary<string, int> GetHeaderColumnMap(IXLWorksheet ws, int headerRow)
        {
            try
            {
                var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

                int lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 1;

                for (int column = 1; column <= lastCol; column++)
                {
                    var header = ws.Cell(headerRow, column).GetString().Trim();
                    if (!string.IsNullOrWhiteSpace(header) && !map.ContainsKey(header))
                        map[header] = column;
                }

                return map;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in LoadFromExcel().");
                throw;
            }
        }

        private static string? GetTrimmed(IXLWorksheet ws, int row, int col)
        {
            // Safe for blank cells (returns "")
            return ws.Cell(row, col).GetString().Trim();
        }

        private static string? NullIfBlank(string? s)
        {
            return string.IsNullOrWhiteSpace(s) ? null : s;
        }

        private static double GetDouble(IXLWorksheet ws, int row, int col, string fieldName)
        {
            var cell = ws.Cell(row, col);

            // If it's numeric, take it directly
            if (cell.DataType == XLDataType.Number)
                return cell.GetDouble();

            // Otherwise parse string
            var text = cell.GetString().Trim();
            if (double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var value))
            {
                return value;
            }               

            throw new InvalidOperationException($"Row {row}: '{fieldName}' is not a valid number ('{text}').");
        }

        public Task<MyCityDto?> GetCityByIdAsync(int id)
        {
            throw new NotImplementedException();
        }



        #endregion

        #region Admin



        public Task<int> CreateCityAsync(MyCityDto city)
        {
            throw new NotImplementedException();
        }

        public Task<bool> UpdateCityAsync(MyCityDto city)
        {
            throw new NotImplementedException();
        }

        public Task<bool> DeleteCityAsync(int id)
        {
            throw new NotImplementedException();
        }


        #endregion
    }
}
