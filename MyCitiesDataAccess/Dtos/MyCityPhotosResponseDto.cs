
namespace MyCitiesDataAccess.Dtos
{
    public sealed class MyCityPhotosResponseDto
    {
        public int PhotoKey { get; init; }
        public IReadOnlyList<MyCityPhotoDto> Photos { get; init; } = [];
    }
}
