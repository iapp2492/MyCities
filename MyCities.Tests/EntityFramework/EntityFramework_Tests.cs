using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using MyCitiesDataAccess;
using MyCitiesDataAccess.Contexts;

namespace MyCities.Tests.EntityFramework
{
    public class EntityFramework_Tests
    {
        // Here we use a dedicated test DB {MyCities_Test} so that we never risk touching your real data.
        private const string ConnectionString =
            "Server=FOOTHILL\\SQLSERVER16;Database=MyCities_Test;Trusted_Connection=True;TrustServerCertificate=True;";

        [Fact]
        public async Task GetAllCitiesAsync_UsesSqlServerView_ReturnsMappedDtos_OrderedByCountryThenCity()
        {
            var options = new DbContextOptionsBuilder<MyCitiesDbContext>()
                .UseSqlServer(ConnectionString)
                .Options;

            await using var ctx = new MyCitiesDbContext(options);

            await using var tx = await ctx.Database.BeginTransactionAsync();

            var countryIdCanada = await InsertCountryAsync(ctx, "Canada", "CA", "CAN", 124);
            var countryIdTanzania = await InsertCountryAsync(ctx, "Tanzania", "TZ", "TZA", 834);

            // Region requires group fields + sort orders (tinyint)
            var regionIdAlberta = await InsertRegionAsync(ctx, "Canada", 1, "Alberta", 1);
            var regionIdQuebec = await InsertRegionAsync(ctx, "Canada", 1, "Quebec", 2);
            var regionIdArusha = await InsertRegionAsync(ctx, "Tanzania", 2, "Arusha", 1);

            // StayDuration requires SortOrder
            var sdIdShort = await InsertStayDurationAsync(ctx, "1-3 months", 1);
            var sdIdMedium = await InsertStayDurationAsync(ctx, "3-6 months", 2);

            // Decade requires StartYear (smallint) + SortOrder; label is computed
            var decadeId1990s = await InsertDecadeAsync(ctx, 1990, 1990);
            var decadeId2000s = await InsertDecadeAsync(ctx, 2000, 2000);


            var myCityIdArusha = await InsertMyCityAsync(
                ctx,
                "Arusha",
                countryIdTanzania,
                regionIdArusha,
                sdIdShort,
                -3.3667m,
                36.6833m,
                "Note A",
                5);

            var myCityIdMontreal = await InsertMyCityAsync(
                ctx,
                "Montreal",
                countryIdCanada,
                regionIdQuebec,
                sdIdMedium,
                45.5017m,
                -73.5673m,
                "Note M",
                36
                );

            // Calgary gets TWO decades to prove the STUFF/FOR XML aggregation works
            var myCityIdCalgary = await InsertMyCityAsync(
                ctx,
                "Calgary",
                countryIdCanada,
                regionIdAlberta,
                sdIdMedium,
                51.0447m,
                -114.0719m,
                "Note C",
                11);

            await InsertMyCityDecadeAsync(ctx, myCityIdCalgary, decadeId1990s);
            await InsertMyCityDecadeAsync(ctx, myCityIdCalgary, decadeId2000s);

            var svc = new EfMyCitiesDataService(ctx, NullLogger<EfMyCitiesDataService>.Instance);

            var results = await svc.GetAllCitiesAsync();

            // We inserted exactly three cities
            Assert.Equal(3, results.Count);

            // Ordered by Country then City (per your service code)
            Assert.Equal("Canada", results[0].Country);
            Assert.Equal("Calgary", results[0].City);

            Assert.Equal("Canada", results[1].Country);
            Assert.Equal("Montreal", results[1].City);

            Assert.Equal("Tanzania", results[2].Country);
            Assert.Equal("Arusha", results[2].City);

            // Mapping checks
            var arusha = results.Single(x => x.Country == "Tanzania" && x.City == "Arusha");
            Assert.Equal("Arusha", arusha.Region);
            Assert.Equal(-3.3667d, arusha.Lat, 4);
            Assert.Equal(36.6833d, arusha.Lon, 4);
            Assert.Equal("1-3 months", arusha.StayDuration);
            Assert.Equal(string.Empty, arusha.Decades); // view returns NULL => service maps to empty string
            Assert.Equal("Note A", arusha.Notes);
            Assert.Equal(5, arusha.PhotoKey);

            var montreal = results.Single(x => x.Country == "Canada" && x.City == "Montreal");
            Assert.Equal(36, montreal.PhotoKey);

            // Decades aggregation (order should follow Decade.SortOrder)
            var calgary = results.Single(x => x.Country == "Canada" && x.City == "Calgary");
            Assert.Equal("1990s, 2000s", calgary.Decades);
            Assert.Equal(11, calgary.PhotoKey);

            // AsNoTracking expectation (service uses AsNoTracking)
            Assert.Empty(ctx.ChangeTracker.Entries());

            // No residue
            await tx.RollbackAsync();
        }
        private static async Task<int> InsertCountryAsync(
               MyCitiesDbContext ctx,
               string displayName,
               string iso2,
               string iso3,
               int? m49 = null,
               bool isActive = true)
        {
            const string sql = @"
                INSERT INTO dbo.Country (Iso2, Iso3, M49, DisplayName, IsActive)
                VALUES (@Iso2, @Iso3, @M49, @DisplayName, @IsActive);
                SELECT CAST(SCOPE_IDENTITY() AS int);";

            return await ExecuteScalarIntAsync(
                ctx,
                sql,
                new SqlParameter("@Iso2", iso2),
                new SqlParameter("@Iso3", iso3),
                new SqlParameter("@M49", (object?)m49 ?? DBNull.Value),
                new SqlParameter("@DisplayName", displayName),
                new SqlParameter("@IsActive", isActive));
        }


        private static async Task<int> InsertRegionAsync(
            MyCitiesDbContext ctx,
            string groupName,
            byte groupSortOrder,
            string regionName,
            byte regionSortOrder)
        {
            const string sql = @"
                INSERT INTO dbo.Region (GroupName, GroupSortOrder, RegionName, RegionSortOrder)
                VALUES (@GroupName, @GroupSortOrder, @RegionName, @RegionSortOrder);
                SELECT CAST(SCOPE_IDENTITY() AS int);";

            return await ExecuteScalarIntAsync(
                ctx,
                sql,
                new SqlParameter("@GroupName", groupName),
                new SqlParameter("@GroupSortOrder", groupSortOrder),
                new SqlParameter("@RegionName", regionName),
                new SqlParameter("@RegionSortOrder", regionSortOrder));
        }

        private static async Task<int> InsertStayDurationAsync(MyCitiesDbContext ctx, string label, int sortOrder)
        {
            const string sql = @"
                INSERT INTO dbo.StayDuration (Label, SortOrder)
                VALUES (@Label, @SortOrder);
                SELECT CAST(SCOPE_IDENTITY() AS int);";

            return await ExecuteScalarIntAsync(
                ctx,
                sql,
                new SqlParameter("@Label", label),
                new SqlParameter("@SortOrder", sortOrder));
        }

        private static async Task<int> InsertDecadeAsync(MyCitiesDbContext ctx, short startYear, int sortOrder)
        {
            // Label is computed, so DO NOT insert it
            const string sql = @"
                INSERT INTO dbo.Decade (StartYear, SortOrder)
                VALUES (@StartYear, @SortOrder);
                SELECT CAST(SCOPE_IDENTITY() AS int);";

            return await ExecuteScalarIntAsync(
                ctx,
                sql,
                new SqlParameter("@StartYear", startYear),
                new SqlParameter("@SortOrder", sortOrder));
        }


        private static async Task<int> InsertMyCityAsync(
            MyCitiesDbContext ctx,
            string cityName,
            int countryId,
            int regionId,
            int stayDurationId,
            decimal lat,
            decimal lon,
            string notes,
            int photoKey)
        {
            const string sql = @"
                INSERT INTO dbo.MyCity (CityName, CountryId, RegionId, StayDurationId, Latitude, Longitude, Notes, PhotoKey)
                VALUES (@CityName, @CountryId, @RegionId, @StayDurationId, @Latitude, @Longitude, @Notes, @PhotoKey);
                SELECT CAST(SCOPE_IDENTITY() AS int);";

            return await ExecuteScalarIntAsync(
                ctx,
                sql,
                new SqlParameter("@CityName", cityName),
                new SqlParameter("@CountryId", countryId),
                new SqlParameter("@RegionId", regionId),
                new SqlParameter("@StayDurationId", stayDurationId),
                new SqlParameter("@Latitude", lat),
                new SqlParameter("@Longitude", lon),
                new SqlParameter("@Notes", notes),
                new SqlParameter("@PhotoKey", photoKey));
        }

        private static async Task InsertMyCityDecadeAsync(MyCitiesDbContext ctx, int myCityId, int decadeId)
        {
            const string sql = @"
                INSERT INTO dbo.MyCityDecade (MyCityId, DecadeId)
                VALUES (@MyCityId, @DecadeId);";

            await ctx.Database.ExecuteSqlRawAsync(
                sql,
                new SqlParameter("@MyCityId", myCityId),
                new SqlParameter("@DecadeId", decadeId));
        }

        private static async Task<int> ExecuteScalarIntAsync(MyCitiesDbContext ctx, string sql, params SqlParameter[] parameters)
        {
            var conn = (SqlConnection)ctx.Database.GetDbConnection();

            if (conn.State != System.Data.ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;

            var currentTx = ctx.Database.CurrentTransaction;
            if (currentTx != null)
            {
                cmd.Transaction = (SqlTransaction)currentTx.GetDbTransaction();
            }

            foreach (var p in parameters)
            {
                cmd.Parameters.Add(p);
            }

            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }
    }
}
