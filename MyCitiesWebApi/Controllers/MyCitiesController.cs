using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using MyCitiesDataAccess;                 
using MyCitiesDataAccess.Dtos;
using Serilog.Context;
using System.Data.Common;

namespace MyCitiesWebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
#if DEBUG
    [EnableCors("AllowAnyOrigin")]
#else
    [EnableCors("AllowOnlyMyCities")] 
#endif
    public class MyCitiesController : ControllerBase
    {
        #region Fields


        private readonly ILogger<MyCitiesController> _logger;
        private readonly IMyCitiesDataService _myCitiesDataService;

        #endregion

        #region Constructors


        public MyCitiesController(IMyCitiesDataService myCitiesDataService, ILogger<MyCitiesController> logger)
        {
            _logger = logger;
            _myCitiesDataService = myCitiesDataService;
        }


        #endregion

        #region Cities Operations


        // GET api/MyCities/GetAllCities
        [HttpGet("GetAllCities")]
        public async Task<ActionResult<IEnumerable<MyCityDto>>> GetAllCitiesAsync()
        {
            var traceId = HttpContext.TraceIdentifier;

            using (LogContext.PushProperty("Method", "MyCitiesController.GetAllCitiesAsync"))
            using (LogContext.PushProperty("Args", new { }, destructureObjects: true))
            using (LogContext.PushProperty("TraceId", traceId))
            {
                const int maxAttempts = 3;

                for (var attempt = 1; attempt <= maxAttempts; attempt++)
                {
                    try
                    {
                        var cities = await _myCitiesDataService.GetAllCitiesAsync();
                        return Ok(cities);
                    }
                    catch (Exception ex) when (IsTransient(ex) && attempt < maxAttempts)
                    {
                        var delayMs = 250 * attempt * attempt; // 250ms, 1000ms
                        _logger.LogWarning(
                            ex,
                           "Transient error in GetAllCitiesAsync. Attempt {Attempt} of {MaxAttempts}. DelayMs={DelayMs}. TraceId={TraceId}",
                            attempt,
                            maxAttempts,
                            delayMs,
                            traceId);

                        await Task.Delay(delayMs);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(
                            ex,
                            "GetAllCitiesAsync failed after {Attempts} attempt(s). TraceId={TraceId}",
                            attempt,
                            traceId);

                        return StatusCode(
                            StatusCodes.Status503ServiceUnavailable,
                            new
                            {
                                message = "Sorry — we couldn’t load the city data right now. Please try again in a moment.",
                                traceId
                            });
                    }
                }

                // Unreachable, but keeps the compiler happy.
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    new
                    {
                        message = "Sorry — we couldn’t load the city data right now. Please try again in a moment.",
                        traceId
                    });
            }
        }

        // GET api/MyCities/GetCityById/5
        [HttpGet("GetCityById/{id:int}")]
        public async Task<ActionResult<MyCityDto>> GetCityByIdAsync(int id)
        {
            try
            {
                var city = await _myCitiesDataService.GetCityByIdAsync(id);
                if (city == null)
                    return NotFound();

                return Ok(city);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred in GetCityByIdAsync for Id: {id}.");
                throw;
            }
        }

        [HttpGet("GetAllPhotos")]
        [ProducesResponseType(typeof(IReadOnlyList<MyCityPhotosResponseDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IReadOnlyList<MyCityPhotosResponseDto>>> GetAllPhotos()
        {
            IReadOnlyList<MyCityPhotosResponseDto> results =
                await this._myCitiesDataService.GetAllPhotosAsync();

            return this.Ok(results);
        }

        // Generate a list of cities which have photos (so that the View Photos link only is displayed when photos actually exist)
        [HttpGet("GetActivePhotoKeys")]
        public async Task<ActionResult<List<int>>> GetActivePhotoKeys()
        {
            List<int> activePhotoKeys = await _myCitiesDataService.GetActivePhotoKeysAsync(); 
            return Ok(activePhotoKeys);
        }



        #endregion

        #region Admin

        // POST api/MyCities/CreateCity
        [HttpPost("CreateCity")]
        public async Task<ActionResult<int>> CreateCityAsync([FromBody] MyCityDto city)
        {
            // With [ApiController], invalid model state returns 400 automatically.
            var newId = await _myCitiesDataService.CreateCityAsync(city);
            return Ok(newId);
        }

        // PUT api/MyCities/UpdateCity/5
        [HttpPut("UpdateCity/{id:int}")]
        public async Task<IActionResult> UpdateCityAsync(int id, [FromBody] MyCityDto city)
        {
            if (id != city.Id)
                return BadRequest("Route id does not match payload id.");

            var updated = await _myCitiesDataService.UpdateCityAsync(city);
            if (!updated)
                return NotFound();

            return NoContent();
        }

        // DELETE api/MyCities/DeleteCity/5
        [HttpDelete("DeleteCity/{id:int}")]
        public async Task<IActionResult> DeleteCityAsync(int id)
        {
            var deleted = await _myCitiesDataService.DeleteCityAsync(id);
            if (!deleted)
                return NotFound();

            return NoContent();
        }

        #endregion

        #region Helpers

        private static bool IsTransient(Exception ex)
        {
            // Walk the exception chain to find a database-ish root cause
            for (var current = ex; current != null; current = current.InnerException)
            {
                // Common transient SQL patterns bubble up as DbException/TimeoutException.
                if (current is TimeoutException)
                {
                    return true;
                }

                if (current is DbException dbEx)
                {
                    // Not every provider exposes error numbers consistently.
                    // We treat DbException as possibly transient, but you can tighten later.
                    var msg = dbEx.Message ?? string.Empty;

                    if (msg.Contains("timeout", StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    if (msg.Contains("deadlock", StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    if (msg.Contains("could not open a connection", StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    if (msg.Contains("transport-level error", StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }
            }

            return false;
        }


        #endregion
    }
}
