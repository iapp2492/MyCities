
using MyCitiesDataAccess.Dtos;

namespace MyCitiesDataAccess
{
    public interface IMyCitiesFilterReader
    {
        Task<List<LocationFilterOptionDto>> GetLocationFilterOptionsAsync();
    }
}
