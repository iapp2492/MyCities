using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MyCitiesDataAccess.Contexts;
using Serilog.Context;
using System.Runtime.InteropServices;

namespace MyCitiesWebApi.Controllers
{

    [ApiController]
    [Route("api/[controller]")]
    public class DebuggingController : Controller
    {

        IOptions<MyCitiesSettings> _myCitiesSettings;
        private readonly MyCitiesDbContext _db;
        private readonly ILogger<DebuggingController> _logger;

        public DebuggingController (IOptions<MyCitiesSettings> myCitiesSettings, MyCitiesDbContext db, ILogger<DebuggingController> logger)
        {
            _myCitiesSettings = myCitiesSettings;
            _db = db;
            _logger = logger;
        }
    
        [HttpGet]
        [Route("GetEnvironmentInfo")]
        public IActionResult GetEnvironmentInfo()
        {

            MyCitiesSettings settings = _myCitiesSettings.Value;

            var result = new
            {
                ServerIntro = "The following two values indicate the current attached database",
                Server = settings.SQLSettings.Server,
                Database = settings.SQLSettings.Database,
                Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            };

            return new JsonResult(result);
        }


        [HttpGet]
        [Route("GetRuntimeInfo")]
        public IActionResult GetRuntime()
        {
            var result = new
            {
                Framework = RuntimeInformation.FrameworkDescription,
                OS = RuntimeInformation.OSDescription,
                ProcessArchitecture = RuntimeInformation.ProcessArchitecture.ToString(),
                OSArchitecture = RuntimeInformation.OSArchitecture.ToString(),
                Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "(null)"
            };

            return Ok(result);
        }


        [HttpGet]
        [Route("TestDatabase")]
        public async Task<IActionResult> TestDatabase()
        {
            try
            {
                var dbConn = _db.Database.GetDbConnection();

                // Note: This does NOT reveal passwords. It only shows where EF thinks it's connecting.
                var info = new
                {
                    DataSource = dbConn.DataSource,
                    Database = dbConn.Database,
                    CanConnect = await _db.Database.CanConnectAsync(),
                    Provider = _db.Database.ProviderName
                };

                return Ok(info);
            }
            catch (Exception ex)
            {
                var err = new
                {
                    Error = "Database test failed",
                    ExceptionType = ex.GetType().FullName,
                    Message = ex.Message,
                    InnerMessage = ex.InnerException?.Message
                };

                // 500 is fine here; it’s a diagnostic endpoint.
                return StatusCode(500, err);
            }
        }


#if DEBUG

        [HttpGet("SerilogTestInfo")]
        public IActionResult SerilogTestInfo()
        {
            _logger.LogInformation("This is a test informational log.");
            return Ok("Info log written.");
        }

        [HttpGet("SerilogTestWarning")]
        public IActionResult SerilogTestWarning()
        {
            _logger.LogWarning("This is a test warning log.");
            return Ok("Warning log written.");
        }

        [HttpGet("SerilogTestErrorCaught")]
        public IActionResult SerilogTestErrorCaught()
        {
            using (LogContext.PushProperty("Method", "DebuggingController.SerilogTestErrorCaught"))
            using (LogContext.PushProperty("Args", new { SampleValue = 42 }, destructureObjects: true))
            {
                try
                {
                    throw new InvalidOperationException("Artificial caught exception.");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Caught test exception.");
                    return StatusCode(500, "Caught exception logged.");
                }
            }
        }

        [HttpGet("SerilogTestUnhandledException")]
        public IActionResult SerilogTestUnhandledException()
        {
            using (LogContext.PushProperty("Method", "DebuggingController.SerilogTestUnhandledException"))
            using (LogContext.PushProperty("Args", new { SampleValue = 99 }, destructureObjects: true))
            {
                throw new Exception("Artificial unhandled exception.");
            }
        }

#endif

    }
}
