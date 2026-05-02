using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MyCitiesDataAccess.Contexts;
using MyCitiesDataAccess.Dtos;
using MyCitiesDataAccess.Models;

namespace MyCitiesDataAccess
{
    // Historically, this app was initially developed using an Excel spreadsheet as the source of data but eventually the data source was transitioned to a SQL Server database.
    // As new features were added, they were not included in the Excel data service.  In order to satisfy the Liskov Substituion Principle and the Interface Segregation Principle,
    // the methods for new features were placed in new targeted interfaces (e.g. IMyCitiesPhotoReader) and implemented only in this class (not in the deprecated Excel data service). 
    // IMyCitiesListReader, IMyCitiesDetailReader, IMyCitiesPhotoReader, IMyCitiesFilterReader, IMyCitiesAdminDataService have been combined into a facade interface IMyCitiesDataService
    // as a convenience for use by the rest of this app.
    public class EfMyCitiesDataService : IMyCitiesDataService
    {
        #region Fields


        private readonly MyCitiesDbContext _db;
        private readonly ILogger<EfMyCitiesDataService> _logger;


        #endregion

        #region Constructors


        public EfMyCitiesDataService(MyCitiesDbContext db, ILogger<EfMyCitiesDataService> logger)
        {
            _db = db;
            _logger = logger;
        }


        #endregion

        #region Public API


        public async Task<IReadOnlyList<MyCityDto>> GetAllCitiesAsync()
        {
            // View already returns spreadsheet-shaped rows
            var rows = await _db.vw_MyCity_Spreadsheet
                .AsNoTracking()
                .OrderBy(x => x.Country)
                .ThenBy(x => x.City)
                .ToListAsync();

            return rows.Select(ToDto).ToList();
        }

        public Task ReloadAsync()
        {
            // No-op: DB is now the source of truth
            return Task.CompletedTask;
        }


        public async Task<IReadOnlyList<MyCityPhotosResponseDto>> GetAllPhotosAsync()
        {
            List<MyCityPhoto> rows = await this._db.MyCityPhotos
                .AsNoTracking()
                .OrderBy(p => p.PhotoKey)
                .ThenBy(p => p.SortOrder)
                .ThenBy(p => p.PhotoIndex)
                .ToListAsync();

            List<MyCityPhotosResponseDto> results = rows
                .GroupBy(p => p.PhotoKey)
                .Select(g => new MyCityPhotosResponseDto
                {
                    PhotoKey = g.Key,
                    Photos = g.Select(p => new MyCityPhotoDto
                    {
                        PhotoKey = p.PhotoKey,
                        PhotoIndex = p.PhotoIndex,
                        SortOrder = p.SortOrder,
                        Title = p.Title,
                        Caption = p.Caption,
                        FileName = p.FileName,
                        Url = $"assets/images/cities/{p.PhotoKey}/{p.FileName}"
                    })
                    .ToList()
                })
                .ToList();

            return results;
        }

        public async Task<List<int>> GetActivePhotoKeysAsync()
        {
            List<int> activePhotoKeys = await _db.MyCityPhotos
                .Where(x => x.PhotoKey > 0)
                .Select(x => x.PhotoKey)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync();

            return activePhotoKeys;
        }

        public async Task<List<LocationFilterOptionDto>> GetLocationFilterOptionsAsync()
        {
            var items = await _db.LocationFilterOptions
                .OrderBy(x => x.PrimarySort)
                .ThenBy(x => x.SecondarySort)
                .ThenBy(x => x.FilterLabel)
                .Select(x => new LocationFilterOptionDto
                {
                    FilterType = x.FilterType,
                    FilterId = x.FilterId,
                    FilterValue = x.FilterValue,
                    FilterLabel = x.FilterLabel
                })
                .ToListAsync();

            return items;
        }

        private static MyCityDto ToDto(vw_MyCity_Spreadsheet x)
        {
            return new MyCityDto
            {
                City = x.City,
                Country = x.Country,
                CountryId = x.CountryId,
                Region = x.Region,
                RegionId = x.RegionId,
                Lat = (double)x.Lat,
                Lon = (double)x.Lon,
                StayDuration = x.StayDuration,
                Decades = x.Decades ?? string.Empty,
                Notes = x.Notes,
                PhotoKey = x.PhotoKey
            };
        }

        public Task<MyCityDto?> GetCityByIdAsync(int id)
        {
            // Not currently implemented because there are no current use cases for it but available for future use if needed.  
            return Task.FromResult<MyCityDto?>(null);
        }


        #endregion

        #region Admin


        // All admin methods are not currently used but are available for future use, when needed.
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
