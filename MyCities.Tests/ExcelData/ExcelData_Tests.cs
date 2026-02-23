using ClosedXML.Excel;
using Microsoft.Extensions.Logging;
using MyCitiesDataAccess;

namespace MyCities.Tests.ExcelData
{
    public sealed class ExcelData_Tests : IDisposable
    {
        private readonly string _tempDir;

        public ExcelData_Tests()
        {
            _tempDir = Path.Combine(Path.GetTempPath(), "MyCities_ExcelData_Tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_tempDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_tempDir))
                {
                    Directory.Delete(_tempDir, recursive: true);
                }
            }
            catch
            {
                // best effort cleanup
            }
        }

        [Fact]
        public async Task GetAllCitiesAsync_WhenExcelPathNotConfigured_ThrowsInvalidOperationException()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var sut = new ExcelMyCitiesDataService(
                excelPath: "   ",
                worksheetName: "Sheet1",
                logger: logger);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(async () => await sut.GetAllCitiesAsync());

            Assert.Contains("ExcelFilePath is not configured", ex.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task GetAllCitiesAsync_WhenFileDoesNotExist_ThrowsFileNotFoundException()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var missingPath = Path.Combine(_tempDir, "MyCitiesData.xlsx");

            var sut = new ExcelMyCitiesDataService(
                excelPath: missingPath,
                worksheetName: "Sheet1",
                logger: logger);

            var ex = await Assert.ThrowsAsync<FileNotFoundException>(async () => await sut.GetAllCitiesAsync());

            Assert.Contains("MyCitiesData.xlsx not found", ex.Message, StringComparison.OrdinalIgnoreCase);
            Assert.Equal(missingPath, ex.FileName);
        }

        [Fact]
        public async Task GetAllCitiesAsync_WhenWorksheetMissing_ThrowsInvalidOperationException_AndLogsError()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();
            var path = CreateWorkbook(
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    new("Arusha", "Tanzania", "Arusha Region",  -3.3869, 36.68299, "Months", "2020s", "note")
                });

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "WrongSheetName",
                logger: logger);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(async () => await sut.GetAllCitiesAsync());

            Assert.Contains("Worksheet", ex.Message, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("not found", ex.Message, StringComparison.OrdinalIgnoreCase);

            Assert.Contains(logger.Entries, e => e.LogLevel == LogLevel.Error && e.Exception != null);
        }

        [Fact]
        public async Task GetAllCitiesAsync_WhenHeadersCannotBeFound_ThrowsInvalidOperationException()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();
            var path = Path.Combine(_tempDir, "badheaders.xlsx");

            using (var wb = new XLWorkbook())
            {
                var ws = wb.AddWorksheet("Data");
                ws.Cell(1, 1).Value = "NotAHeader";
                ws.Cell(2, 1).Value = "AlsoNotAHeader";
                wb.SaveAs(path);
            }

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "Data",
                logger: logger);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(async () => await sut.GetAllCitiesAsync());

            Assert.Contains("Could not find header row", ex.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task GetAllCitiesAsync_WhenMissingARequiredHeader_ThrowsInvalidOperationException()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();
            var path = Path.Combine(_tempDir, "missingrequired.xlsx");

            using (var wb = new XLWorkbook())
            {
                var ws = wb.AddWorksheet("Data");

                // Header row at row 2, starting at col 2 (B2)
                var row = 2;
                var col = 2;

                // Intentionally omit "Lon"
                var headers = new[]
                {
                    "City", "Country", "Region", "Lat", "StayDuration", "Decades", "Notes"
                };

                for (int i = 0; i < headers.Length; i++)
                {
                    ws.Cell(row, col + i).Value = headers[i];
                }

                // A data row so header search finds enough matches
                ws.Cell(row + 2, col + 0).Value = "Arusha";
                ws.Cell(row + 2, col + 1).Value = "Tanzania";
                ws.Cell(row + 2, col + 2).Value = "Arusha Region";
                ws.Cell(row + 2, col + 3).Value = -3.3869;
                ws.Cell(row + 2, col + 4).Value = "Months";
                ws.Cell(row + 2, col + 5).Value = "2020s";
                ws.Cell(row + 2, col + 6).Value = "note";

                wb.SaveAs(path);
            }

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "Data",
                logger: logger);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(async () => await sut.GetAllCitiesAsync());

            Assert.Contains("Missing required header 'Lon'", ex.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task GetAllCitiesAsync_ReadsRowsAfterHeader_SkipsLeadingBlankRows_StopsAtFirstBlankCityAfterStart()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var path = CreateWorkbook(
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    // The test helper will also insert blank rows before first city
                    new("Arusha", "Tanzania", "Arusha Region",  -3.3869, 36.68299, "Months", "2020s", "first"),
                    new("Montreal", "Canada", "Quebec",          45.5017, -73.5673, "Years",  "1990s", "second"),
                    CityRow.BlankCityRow(), // should stop here
                    new("ShouldNotLoad", "X", "Y", 1, 2, "Z", "Z", "Z")
                },
                insertLeadingBlankDataRows: 2);

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "Data",
                logger: logger);

            var cities = await sut.GetAllCitiesAsync();

            Assert.Equal(2, cities.Count);

            Assert.Equal(1, cities[0].Id);
            Assert.Equal("Arusha", cities[0].City);
            Assert.Equal("Tanzania", cities[0].Country);
            Assert.Equal("Arusha Region", cities[0].Region);
            Assert.Equal(-3.3869, cities[0].Lat, 6);
            Assert.Equal(36.68299, cities[0].Lon, 6);
            Assert.Equal("Months", cities[0].StayDuration);
            Assert.Equal("2020s", cities[0].Decades);
            Assert.Equal("first", cities[0].Notes);

            Assert.Equal(2, cities[1].Id);
            Assert.Equal("Montreal", cities[1].City);
        }

        [Fact]
        public async Task GetAllCitiesAsync_WhenNotesBlank_SetsNotesNull()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var path = CreateWorkbook(
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    new("Arusha", "Tanzania", "Arusha Region", -3.3869, 36.68299, "Months", "2020s", notes: "   ")
                });

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "Data",
                logger: logger);

            var cities = await sut.GetAllCitiesAsync();

            Assert.Single(cities);
            Assert.Null(cities[0].Notes);
        }

        [Fact]
        public async Task GetAllCitiesAsync_ParsesLatLon_WhenStoredAsTextInvariantCulture()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var path = CreateWorkbook(
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    new("Arusha", "Tanzania", "Arusha Region", "-3.3869", "36.68299", "Months", "2020s", "note")
                });

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "Data",
                logger: logger);

            var cities = await sut.GetAllCitiesAsync();

            Assert.Single(cities);
            Assert.Equal(-3.3869, cities[0].Lat, 6);
            Assert.Equal(36.68299, cities[0].Lon, 6);
        }

        [Fact]
        public async Task GetAllCitiesAsync_WhenLatInvalid_ThrowsInvalidOperationException_AndLogsError()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var path = CreateWorkbook(
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    new("Arusha", "Tanzania", "Arusha Region", "NOT_A_NUMBER", "36.68299", "Months", "2020s", "note")
                });

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "Data",
                logger: logger);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(async () => await sut.GetAllCitiesAsync());

            Assert.Contains("Lat", ex.Message, StringComparison.OrdinalIgnoreCase);
            Assert.Contains("not a valid number", ex.Message, StringComparison.OrdinalIgnoreCase);

            Assert.Contains(logger.Entries, e => e.LogLevel == LogLevel.Error && e.Exception != null);
        }

        [Fact]
        public async Task GetAllCitiesAsync_CachesResult_SecondCallDoesNotReload_WhenFileUnchanged()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var path = CreateWorkbook(
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    new("Arusha", "Tanzania", "Arusha Region", -3.3869, 36.68299, "Months", "2020s", "note")
                });

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "Data",
                logger: logger);

            var first = await sut.GetAllCitiesAsync();
            var second = await sut.GetAllCitiesAsync();

            Assert.Single(first);
            Assert.Single(second);

            // Same cached list instance should be returned (the service returns _cache directly)
            Assert.True(ReferenceEquals(first, second));

            // Only one "loaded" info log should be present
            var loadedInfos = logger.Entries
                .Where(e => e.LogLevel == LogLevel.Information && e.Message.Contains("Excel loaded", StringComparison.OrdinalIgnoreCase))
                .ToList();

            Assert.Single(loadedInfos);
        }

        [Fact]
        public async Task GetAllCitiesAsync_ReloadsWhenFileLastWriteChanges()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var path = CreateWorkbook(
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    new("Arusha", "Tanzania", "Arusha Region", -3.3869, 36.68299, "Months", "2020s", "note1")
                });

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "Data",
                logger: logger);

            var first = await sut.GetAllCitiesAsync();
            Assert.Single(first);
            Assert.Equal("note1", first[0].Notes);

            // Rewrite file with different note, ensuring timestamp changes
            await Task.Delay(50);

            OverwriteWorkbook(
                excelPath: path,
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    new("Arusha", "Tanzania", "Arusha Region", -3.3869, 36.68299, "Months", "2020s", "note2")
                });

            var second = await sut.GetAllCitiesAsync();
            Assert.Single(second);
            Assert.Equal("note2", second[0].Notes);

            // Should have logged load twice (initial + reload)
            var loadedInfos = logger.Entries
                .Where(e => e.LogLevel == LogLevel.Information && e.Message.Contains("Excel loaded", StringComparison.OrdinalIgnoreCase))
                .ToList();

            Assert.Equal(2, loadedInfos.Count);
        }

        [Fact]
        public async Task ReloadAsync_ForcesReloadAndLogsReloadedMessage()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var path = CreateWorkbook(
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    new("Arusha", "Tanzania", "Arusha Region", -3.3869, 36.68299, "Months", "2020s", "note1")
                });

            var sut = new ExcelMyCitiesDataService(
                excelPath: path,
                worksheetName: "Data",
                logger: logger);

            var first = await sut.GetAllCitiesAsync();
            Assert.Equal("note1", first[0].Notes);

            OverwriteWorkbook(
                excelPath: path,
                worksheetName: "Data",
                headerRow: 2,
                headerCol: 2,
                rows: new List<CityRow>
                {
                    new("Arusha", "Tanzania", "Arusha Region", -3.3869, 36.68299, "Months", "2020s", "note2")
                });

            await sut.ReloadAsync();

            var second = await sut.GetAllCitiesAsync();
            Assert.Equal("note2", second[0].Notes);

            Assert.Contains(
                logger.Entries,
                e => e.LogLevel == LogLevel.Information && e.Message.Contains("Excel reloaded", StringComparison.OrdinalIgnoreCase));
        }

        [Fact]
        public async Task GetCityByIdAsync_AlwaysThrowsNotImplementedException()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var sut = new ExcelMyCitiesDataService(
                excelPath: "any.xlsx",
                worksheetName: "Data",
                logger: logger);

            await Assert.ThrowsAsync<NotImplementedException>(async () => await sut.GetCityByIdAsync(1));
        }

        [Fact]
        public async Task CreateCityAsync_AlwaysThrowsNotImplementedException()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var sut = new ExcelMyCitiesDataService(
                excelPath: "any.xlsx",
                worksheetName: "Data",
                logger: logger);

            var dto = new MyCitiesDataAccess.Dtos.MyCityDto
            {
                Id = 1,
                City = "Arusha",
                Country = "Tanzania",
                Region = "Arusha Region",
                Lat = -3.3869,
                Lon = 36.68299,
                StayDuration = "Months",
                Decades = "2020s",
                Notes = "note"
            };

            await Assert.ThrowsAsync<NotImplementedException>(async () => await sut.CreateCityAsync(dto));
        }

        [Fact]
        public async Task UpdateCityAsync_AlwaysThrowsNotImplementedException()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var sut = new ExcelMyCitiesDataService(
                excelPath: "any.xlsx",
                worksheetName: "Data",
                logger: logger);

            var dto = new MyCitiesDataAccess.Dtos.MyCityDto
            {
                Id = 1,
                City = "Arusha",
                Country = "Tanzania",
                Region = "Arusha Region",
                Lat = -3.3869,
                Lon = 36.68299,
                StayDuration = "Months",
                Decades = "2020s",
                Notes = "note"
            };

            await Assert.ThrowsAsync<NotImplementedException>(async () => await sut.UpdateCityAsync(dto));
        }

        [Fact]
        public async Task DeleteCityAsync_AlwaysThrowsNotImplementedException()
        {
            var logger = new ListLogger<ExcelMyCitiesDataService>();

            var sut = new ExcelMyCitiesDataService(
                excelPath: "any.xlsx",
                worksheetName: "Data",
                logger: logger);

            await Assert.ThrowsAsync<NotImplementedException>(async () => await sut.DeleteCityAsync(1));
        }




        // ---------------- Helpers ----------------

        private string CreateWorkbook(
            string worksheetName,
            int headerRow,
            int headerCol,
            List<CityRow> rows,
            int insertLeadingBlankDataRows = 0)
        {
            var path = Path.Combine(_tempDir, $"{Guid.NewGuid():N}.xlsx");

            using (var wb = new XLWorkbook())
            {
                var ws = wb.AddWorksheet(worksheetName);

                // Put some blanks above/left if caller wants header starting at B2 etc.
                var headers = new[]
                {
                    "City", "Country", "Region", "Lat", "Lon", "StayDuration", "Decades", "Notes"
                };

                for (int i = 0; i < headers.Length; i++)
                {
                    ws.Cell(headerRow, headerCol + i).Value = headers[i];
                }

                var dataRow = headerRow + 1;

                // Optional blank rows after header before data begins
                for (int i = 0; i < insertLeadingBlankDataRows; i++)
                {
                    dataRow++;
                }

                foreach (var r in rows)
                {
                    // City
                    if (r.City != null)
                    {
                        ws.Cell(dataRow, headerCol + 0).Value = r.City;
                    }

                    ws.Cell(dataRow, headerCol + 1).Value = r.Country ?? string.Empty;
                    ws.Cell(dataRow, headerCol + 2).Value = r.Region ?? string.Empty;

                    SetCellLatLon(ws, dataRow, headerCol + 3, r.Lat);
                    SetCellLatLon(ws, dataRow, headerCol + 4, r.Lon);

                    ws.Cell(dataRow, headerCol + 5).Value = r.StayDuration ?? string.Empty;
                    ws.Cell(dataRow, headerCol + 6).Value = r.Decades ?? string.Empty;

                    if (r.Notes != null)
                    {
                        ws.Cell(dataRow, headerCol + 7).Value = r.Notes;
                    }

                    dataRow++;
                }

                wb.SaveAs(path);
            }

            return path;
        }

        private void OverwriteWorkbook(
            string excelPath,
            string worksheetName,
            int headerRow,
            int headerCol,
            List<CityRow> rows)
        {
            using (var wb = new XLWorkbook())
            {
                var ws = wb.AddWorksheet(worksheetName);

                var headers = new[]
                {
                    "City", "Country", "Region", "Lat", "Lon", "StayDuration", "Decades", "Notes"
                };

                for (int i = 0; i < headers.Length; i++)
                {
                    ws.Cell(headerRow, headerCol + i).Value = headers[i];
                }

                var dataRow = headerRow + 1;

                foreach (var r in rows)
                {
                    if (r.City != null)
                    {
                        ws.Cell(dataRow, headerCol + 0).Value = r.City;
                    }

                    ws.Cell(dataRow, headerCol + 1).Value = r.Country ?? string.Empty;
                    ws.Cell(dataRow, headerCol + 2).Value = r.Region ?? string.Empty;

                    SetCellLatLon(ws, dataRow, headerCol + 3, r.Lat);
                    SetCellLatLon(ws, dataRow, headerCol + 4, r.Lon);

                    ws.Cell(dataRow, headerCol + 5).Value = r.StayDuration ?? string.Empty;
                    ws.Cell(dataRow, headerCol + 6).Value = r.Decades ?? string.Empty;

                    if (r.Notes != null)
                    {
                        ws.Cell(dataRow, headerCol + 7).Value = r.Notes;
                    }

                    dataRow++;
                }

                wb.SaveAs(excelPath);
            }

            // Ensure LastWriteTimeUtc changes even on coarse file timestamp resolution
            var nowUtc = DateTime.UtcNow.AddSeconds(1);
            File.SetLastWriteTimeUtc(excelPath, nowUtc);
        }

        private void SetCellLatLon(IXLWorksheet ws, int row, int col, LatLonValue value)
        {
            if (value.Kind == LatLonKind.Number)
            {
                ws.Cell(row, col).Value = value.NumberValue;
            }
            else
            {
                ws.Cell(row, col).Value = value.TextValue ?? string.Empty;
            }
        }

        // ---------------- Test-only models ----------------

        private sealed record CityRow(
            string? City,
            string? Country,
            string? Region,
            LatLonValue Lat,
            LatLonValue Lon,
            string? StayDuration,
            string? Decades,
            string? Notes)
        {
            public CityRow(string? city, string? country, string? region, double lat, double lon, string? stayDuration, string? decades, string? notes)
                : this(city, country, region, LatLonValue.FromNumber(lat), LatLonValue.FromNumber(lon), stayDuration, decades, notes)
            {
            }

            public CityRow(string? city, string? country, string? region, string latText, string lonText, string? stayDuration, string? decades, string? notes)
                : this(city, country, region, LatLonValue.FromText(latText), LatLonValue.FromText(lonText), stayDuration, decades, notes)
            {
            }

            public static CityRow BlankCityRow()
            {
                return new CityRow(
                    City: null,
                    Country: string.Empty,
                    Region: string.Empty,
                    Lat: LatLonValue.FromNumber(0),
                    Lon: LatLonValue.FromNumber(0),
                    StayDuration: string.Empty,
                    Decades: string.Empty,
                    Notes: string.Empty);
            }
        }

        private enum LatLonKind
        {
            Number,
            Text
        }

        private readonly struct LatLonValue
        {
            public LatLonKind Kind { get; }
            public double NumberValue { get; }
            public string? TextValue { get; }

            private LatLonValue(LatLonKind kind, double numberValue, string? textValue)
            {
                Kind = kind;
                NumberValue = numberValue;
                TextValue = textValue;
            }

            public static LatLonValue FromNumber(double value)
            {
                return new LatLonValue(LatLonKind.Number, value, null);
            }

            public static LatLonValue FromText(string value)
            {
                return new LatLonValue(LatLonKind.Text, 0, value);
            }
        }

        // ---------------- Minimal logger capturing messages ----------------

        private sealed class ListLogger<T> : ILogger<T>
        {
            public List<LogEntry> Entries { get; } = new();

            public IDisposable BeginScope<TState>(TState state) where TState : notnull
            {
                return NullScope.Instance;
            }

            public bool IsEnabled(LogLevel logLevel)
            {
                return true;
            }

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                var message = formatter(state, exception);

                Entries.Add(new LogEntry
                {
                    LogLevel = logLevel,
                    EventId = eventId,
                    Message = message,
                    Exception = exception
                });
            }
        }

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();

            private NullScope()
            {
            }

            public void Dispose()
            {
            }
        }

        private sealed class LogEntry
        {
            public LogLevel LogLevel { get; init; }
            public EventId EventId { get; init; }
            public string Message { get; init; } = string.Empty;
            public Exception? Exception { get; init; }
        }
    }
}
