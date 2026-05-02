
using MyCitiesDataAccess.Dtos;

namespace MyCitiesDataAccess
{
    public interface IMyCitiesPhotoReader
    {
        Task<IReadOnlyList<MyCityPhotosResponseDto>> GetAllPhotosAsync();
        Task<List<int>> GetActivePhotoKeysAsync();
    }
}
