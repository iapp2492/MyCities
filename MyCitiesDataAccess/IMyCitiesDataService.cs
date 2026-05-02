
namespace MyCitiesDataAccess
{
    // This is a facade interface used as a container for all of the functional interfaces
    public interface IMyCitiesDataService: IMyCitiesListReader, IMyCitiesDetailReader, IMyCitiesPhotoReader, IMyCitiesFilterReader, IMyCitiesAdminDataService
    {
    }
}
