using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using MyCitiesDataAccess.Contexts;
using MyCitiesWebApi.Controllers;
using System.Reflection;
using System.Text.Json;

namespace MyCitiesWebApi.Tests.Controllers
{
    public class DebuggingControllerTests
    {
        private const string EnvironmentVariableName = "ASPNETCORE_ENVIRONMENT";

        [Fact]
        public void GetEnvironmentInfo_Returns_JsonResult_WithExpectedValues()
        {
            var originalEnv = Environment.GetEnvironmentVariable(EnvironmentVariableName);
            Environment.SetEnvironmentVariable(EnvironmentVariableName, "UnitTest");

            try
            {
                var settings = CreateSettings(server: "TestServer", database: "TestDb"); 

                var options = Microsoft.Extensions.Options.Options.Create(settings);


                using var db = CreateDbContextInMemory(options);
                var logger = new Mock<ILogger<DebuggingController>>();

                var controller = new DebuggingController(options, db, logger.Object);

                var result = controller.GetEnvironmentInfo();

                var jsonResult = Assert.IsType<JsonResult>(result);
                Assert.NotNull(jsonResult.Value);

                var json = JsonSerializer.Serialize(jsonResult.Value);

                Assert.Contains("\"ServerIntro\"", json);
                Assert.Contains("current attached database", json);

                Assert.Contains("\"Server\":\"TestServer\"", json);
                Assert.Contains("\"Database\":\"TestDb\"", json);

                // Environment can be null if not set, but we set it above.
                Assert.Contains("\"Environment\":\"UnitTest\"", json);
            }
            finally
            {
                Environment.SetEnvironmentVariable(EnvironmentVariableName, originalEnv);
            }
        }

        [Fact]
        public void GetRuntime_Returns_OkObjectResult_WithExpectedValues()
        {
            var originalEnv = Environment.GetEnvironmentVariable(EnvironmentVariableName);
            Environment.SetEnvironmentVariable(EnvironmentVariableName, "UnitTest");

            try
            {
                var settings = CreateSettings(server: "Any", database: "Any");

                var options = Microsoft.Extensions.Options.Options.Create(settings);

                using var db = CreateDbContextInMemory(options);
                var logger = new Mock<ILogger<DebuggingController>>();

                var controller = new DebuggingController(options, db, logger.Object);

                var result = controller.GetRuntime();

                var ok = Assert.IsType<OkObjectResult>(result);
                Assert.NotNull(ok.Value);

                var json = JsonSerializer.Serialize(ok.Value);

                Assert.Contains("\"Framework\"", json);
                Assert.Contains("\"OS\"", json);
                Assert.Contains("\"ProcessArchitecture\"", json);
                Assert.Contains("\"OSArchitecture\"", json);

                Assert.Contains("\"Environment\":\"UnitTest\"", json);
            }
            finally
            {
                Environment.SetEnvironmentVariable(EnvironmentVariableName, originalEnv);
            }
        }

        [Fact]
        public async Task TestDatabase_Returns_Ok_WithProviderAndConnectivity_WhenSqlServer()
        {
            var settings = CreateSettings(server: "SqlServer", database: "SqlServer");
            var optionsSettings = Microsoft.Extensions.Options.Options.Create(settings);

            var dbName = "MyCities_Test_" + Guid.NewGuid().ToString("N");

            // Prefer an env var so the test can run on different machines/CI.
            // Example:
            //   setx MYCITIES_TEST_SQLSERVER "Server=Foothill\\SQLSERVER16;Trusted_Connection=True;TrustServerCertificate=True;"
            var baseConnStr = Environment.GetEnvironmentVariable("MYCITIES_TEST_SQLSERVER")
                ?? "Server=(localdb)\\MSSQLLocalDB;Trusted_Connection=True;TrustServerCertificate=True;";

            var connStr = $"{baseConnStr};Database={dbName};";

            var dbOptions = new DbContextOptionsBuilder<MyCitiesDbContext>()
                .UseSqlServer(connStr)
                .Options;

            await using var db = CreateDbContext(dbOptions, optionsSettings);

            try
            {
                await db.Database.EnsureCreatedAsync();

                var logger = new Mock<ILogger<DebuggingController>>();
                var controller = new DebuggingController(optionsSettings, db, logger.Object);

                var actionResult = await controller.TestDatabase();

                var ok = Assert.IsType<OkObjectResult>(actionResult);
                Assert.NotNull(ok.Value);

                var json = JsonSerializer.Serialize(ok.Value);

                Assert.Contains("\"CanConnect\":true", json);
                Assert.Contains("SqlServer", json, StringComparison.OrdinalIgnoreCase);
            }
            finally
            {
                // Cleanup so your instance doesn't accumulate test DBs.
                await db.Database.EnsureDeletedAsync();
            }
        }

        [Fact]
        public async Task TestDatabase_Returns_500_WithErrorPayload_WhenGetDbConnectionThrows()
        {
            var settings = CreateSettings(server: "Any", database: "Any");

            var options = Microsoft.Extensions.Options.Options.Create(settings);

            // InMemory is NOT relational -> GetDbConnection() throws -> caught -> 500 returned.
            using var db = CreateDbContextInMemory(options);

            var logger = new Mock<ILogger<DebuggingController>>();
            var controller = new DebuggingController(options, db, logger.Object);

            var actionResult = await controller.TestDatabase();

            var obj = Assert.IsType<ObjectResult>(actionResult);
            Assert.Equal(500, obj.StatusCode);

            Assert.NotNull(obj.Value);

            var json = JsonSerializer.Serialize(obj.Value);

            Assert.Contains("Database test failed", json);
            Assert.Contains("\"ExceptionType\"", json);
            Assert.Contains("\"Message\"", json);
        }

#if DEBUG

        [Fact]
        public void SerilogTestInfo_LogsInformation_AndReturnsOk()
        {
            var settings = CreateSettings(server: "Any", database: "Any");

            var options = Microsoft.Extensions.Options.Options.Create(settings);

            using var db = CreateDbContextInMemory(options);

            var logger = new Mock<ILogger<DebuggingController>>();
            var controller = new DebuggingController(options, db, logger.Object);

            var result = controller.SerilogTestInfo();

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Info log written.", ok.Value);

            logger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("test informational log", StringComparison.OrdinalIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void SerilogTestWarning_LogsWarning_AndReturnsOk()
        {
            var settings = CreateSettings(server: "Any", database: "Any");

            var options = Microsoft.Extensions.Options.Options.Create(settings);

            using var db = CreateDbContextInMemory(options);

            var logger = new Mock<ILogger<DebuggingController>>();
            var controller = new DebuggingController(options, db, logger.Object);

            var result = controller.SerilogTestWarning();

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Equal("Warning log written.", ok.Value);

            logger.Verify(
                x => x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("test warning log", StringComparison.OrdinalIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void SerilogTestErrorCaught_Returns500_AndLogsError()
        {
            var settings = CreateSettings(server: "Any", database: "Any");

            var options = Microsoft.Extensions.Options.Options.Create(settings);

            using var db = CreateDbContextInMemory(options);

            var logger = new Mock<ILogger<DebuggingController>>();
            var controller = new DebuggingController(options, db, logger.Object);

            var result = controller.SerilogTestErrorCaught();

            var obj = Assert.IsType<ObjectResult>(result);
            Assert.Equal(500, obj.StatusCode);
            Assert.Equal("Caught exception logged.", obj.Value);

            logger.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.IsAny<It.IsAnyType>(),
                    It.Is<InvalidOperationException>(ex => ex.Message.Contains("Artificial caught exception", StringComparison.OrdinalIgnoreCase)),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public void SerilogTestUnhandledException_Throws()
        {
            var settings = CreateSettings(server: "Any", database: "Any");

            var options = Microsoft.Extensions.Options.Options.Create(settings);

            using var db = CreateDbContextInMemory(options);

            var logger = new Mock<ILogger<DebuggingController>>();
            var controller = new DebuggingController(options, db, logger.Object);

            var ex = Assert.Throws<Exception>(() => controller.SerilogTestUnhandledException());
            Assert.Contains("Artificial unhandled exception", ex.Message);
        }

#endif

        private static MyCitiesSettings CreateSettings(string server, string database)
        {
            // Assumes your real model looks like:
            // MyCitiesSettings { SQLSettings { Server, Database } }
            // If your property names differ, adjust here.
            return new MyCitiesSettings
            {
                SQLSettings = new SQLSettings
                {
                    Server = server,
                    Database = database
                }
            };
        }

        private static MyCitiesDbContext CreateDbContextInMemory(IOptions<MyCitiesSettings> optionsSettings)
        {
            var dbOptions = new DbContextOptionsBuilder<MyCitiesDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
                .Options;

            return CreateDbContext(dbOptions, optionsSettings);
        }

        private static MyCitiesDbContext CreateDbContext(DbContextOptions<MyCitiesDbContext> dbOptions, IOptions<MyCitiesSettings> optionsSettings)
        {
            // Reflection-based factory so this remains "drop-in" even if your MyCitiesDbContext ctor differs.
            // Supported patterns (common):
            // - (DbContextOptions<MyCitiesDbContext> options)
            // - (DbContextOptions<MyCitiesDbContext> options, IOptions<MyCitiesSettings> settings)
            // - (DbContextOptions<MyCitiesDbContext> options, MyCitiesSettings settings)
            // - (IOptions<MyCitiesSettings> settings, DbContextOptions<MyCitiesDbContext> options)
            // etc.

            var ctors = typeof(MyCitiesDbContext)
                .GetConstructors(BindingFlags.Public | BindingFlags.Instance)
                .OrderByDescending(c => c.GetParameters().Length)
                .ToList();

            foreach (var ctor in ctors)
            {
                var parameters = ctor.GetParameters();
                var args = new object?[parameters.Length];
                var ok = true;

                for (var i = 0; i < parameters.Length; i++)
                {
                    var pType = parameters[i].ParameterType;

                    if (pType == typeof(DbContextOptions<MyCitiesDbContext>))
                    {
                        args[i] = dbOptions;
                        continue;
                    }

                    if (pType == typeof(DbContextOptions))
                    {
                        args[i] = dbOptions;
                        continue;
                    }

                    if (pType == typeof(IOptions<MyCitiesSettings>))
                    {
                        args[i] = optionsSettings;
                        continue;
                    }

                    if (pType == typeof(MyCitiesSettings))
                    {
                        args[i] = optionsSettings.Value;
                        continue;
                    }

                    // Unknown parameter type -> cannot satisfy this ctor.
                    ok = false;
                    break;
                }

                if (!ok)
                {
                    continue;
                }

                return (MyCitiesDbContext)ctor.Invoke(args);
            }

            throw new InvalidOperationException(
                $"Could not construct {nameof(MyCitiesDbContext)}. " +
                "Add a supported constructor signature or update the test factory mapping.");
        }
    }
}
