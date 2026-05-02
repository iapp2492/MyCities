using MyCitiesDataAccess.Dtos;

namespace MyCitiesDataAccess
{
    public interface IMyCitiesAdminDataService
    {
        Task<int> CreateCityAsync(MyCityDto city);
        Task<bool> UpdateCityAsync(MyCityDto city);
        Task<bool> DeleteCityAsync(int id);

    }
}
