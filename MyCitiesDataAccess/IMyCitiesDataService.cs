using MyCitiesDataAccess.Dtos;

namespace MyCitiesDataAccess
{
    public interface IMyCitiesDataService
    {
        #region Public API

        Task<IReadOnlyList<MyCityDto>> GetAllCitiesAsync();
        Task ReloadAsync(); // call this after any in-session updates to the Excel file
        Task<MyCityDto?> GetCityByIdAsync(int id);

        #endregion

        #region Admin

        Task<int> CreateCityAsync(MyCityDto city);
        Task<bool> UpdateCityAsync(MyCityDto city);
        Task<bool> DeleteCityAsync(int id);

        #endregion

    }
}
