
using MyCitiesDataAccess.Dtos;

namespace MyCitiesDataAccess
{
    public interface IMyCitiesListReader
    {
        Task<IReadOnlyList<MyCityDto>> GetAllCitiesAsync();
    }
}
