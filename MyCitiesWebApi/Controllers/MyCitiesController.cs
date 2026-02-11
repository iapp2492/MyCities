using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using MyCitiesDataAccess;                 
using MyCitiesDataAccess.Dtos;      

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
            try
            {
                var cities = await _myCitiesDataService.GetAllCitiesAsync();
                return Ok(cities);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in GetAllCitiesAsync.");
                throw;
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
    }
}
