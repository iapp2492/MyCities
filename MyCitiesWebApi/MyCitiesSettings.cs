namespace MyCitiesWebApi
{
    public sealed class MyCitiesSettings
    {
        public required SQLSettings SQLSettings { get; init; }
    }

    public sealed class SQLSettings
    {
        public required string Server { get; init; }

        public required string Database { get; init; }
      
    }
}
