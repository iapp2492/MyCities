
using MyCitiesDataAccess.Dtos;

namespace MyCitiesDataAccess
{
    public interface IMyCitiesDetailReader
    {
        Task<MyCityDto?> GetCityByIdAsync(int id);
    }
}
