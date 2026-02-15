using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MyCitiesDataAccess.Contexts;
using MyCitiesDataAccess.Dtos;
using MyCitiesDataAccess.Models;

namespace MyCitiesDataAccess
{
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
            // No-op: DB is source of truth
            return Task.CompletedTask;
        }


        #endregion

        #region Admin


        // Not currently used but available for future use 
        public Task<MyCityDto?> GetCityByIdAsync(int id)
        {
            return Task.FromResult<MyCityDto?>(null);
        }

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

        private static MyCityDto ToDto(vw_MyCity_Spreadsheet x)
        {
            return new MyCityDto
            {
                City = x.City,
                Country = x.Country,
                Region = x.Region,
                Lat = (double)x.Lat,
                Lon = (double)x.Lon,
                StayDuration = x.StayDuration,
                Decades = x.Decades ?? string.Empty,
                Notes = x.Notes
            };
        }


        #endregion
    }
}
