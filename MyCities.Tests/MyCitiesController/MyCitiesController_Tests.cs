using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using MyCitiesDataAccess.Dtos;
using MyCitiesDataAccess;
using WebApi = MyCitiesWebApi.Controllers;
using Moq;
using System.Data.Common;

namespace MyCities.Tests.MyCitiesController
{
    public class MyCitiesController_Tests
    {
        private readonly Mock<IMyCitiesDataService> _dataSvc = new();
        private readonly Mock<ILogger<WebApi.MyCitiesController>> _logger = new();

        private WebApi.MyCitiesController CreateSut(string traceId = "trace-123")
        {
            var sut = new WebApi.MyCitiesController(_dataSvc.Object, _logger.Object);

            var httpContext = new DefaultHttpContext();
            httpContext.TraceIdentifier = traceId;

            sut.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };

            return sut;
        }

        [Fact]
        public async Task GetAllCitiesAsync_SuccessFirstTry_ReturnsOk_WithCities()
        {
            // Arrange
            var cities = new List<MyCityDto>
            {
                new MyCityDto { Id = 1 },
                new MyCityDto { Id = 2 }
            };

            _dataSvc
                .Setup(s => s.GetAllCitiesAsync())
                .ReturnsAsync(cities);

            var sut = CreateSut();

            // Act
            var result = await sut.GetAllCitiesAsync();

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
            Assert.Same(cities, ok.Value);

            _dataSvc.Verify(s => s.GetAllCitiesAsync(), Times.Once);
        }

        [Fact]
        public async Task GetAllCitiesAsync_TransientThenSuccess_RetriesAndReturnsOk()
        {
            // Arrange
            var cities = new List<MyCityDto>
            {
                new MyCityDto { Id = 1 }
            };

            // 2 transient failures then success
            _dataSvc
                .SetupSequence(s => s.GetAllCitiesAsync())
                .ThrowsAsync(new TimeoutException("timeout-1"))
                .ThrowsAsync(new TimeoutException("timeout-2"))
                .ReturnsAsync(cities);

            var sut = CreateSut();

            // Act
            var result = await sut.GetAllCitiesAsync();

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
            Assert.Same(cities, ok.Value);

            _dataSvc.Verify(s => s.GetAllCitiesAsync(), Times.Exactly(3));
        }

        [Fact]
        public async Task GetAllCitiesAsync_TransientAllAttempts_Returns503_WithTraceId()
        {
            // Arrange
            _dataSvc
                .SetupSequence(s => s.GetAllCitiesAsync())
                .ThrowsAsync(new TimeoutException("timeout-1"))
                .ThrowsAsync(new TimeoutException("timeout-2"))
                .ThrowsAsync(new TimeoutException("timeout-3"));

            var traceId = "trace-xyz";
            var sut = CreateSut(traceId);

            // Act
            var result = await sut.GetAllCitiesAsync();

            // Assert
            var obj = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status503ServiceUnavailable, obj.StatusCode);

            // Controller returns an anonymous object: { message, traceId }
            // We can validate via reflection to avoid "as any" patterns.
            Assert.NotNull(obj.Value);

            var valueType = obj.Value!.GetType();

            var messageProp = valueType.GetProperty("message");
            Assert.NotNull(messageProp);
            var message = messageProp!.GetValue(obj.Value) as string;
            Assert.False(string.IsNullOrWhiteSpace(message));
            Assert.Contains("couldn’t load the city data", message!, StringComparison.OrdinalIgnoreCase);

            var traceIdProp = valueType.GetProperty("traceId");
            Assert.NotNull(traceIdProp);
            var returnedTraceId = traceIdProp!.GetValue(obj.Value) as string;
            Assert.Equal(traceId, returnedTraceId);

            _dataSvc.Verify(s => s.GetAllCitiesAsync(), Times.Exactly(3));
        }

        [Fact]
        public async Task GetAllCitiesAsync_NonTransientExceptionFirstAttempt_Returns503_AndDoesNotRetry()
        {
            // Arrange
            _dataSvc
                .Setup(s => s.GetAllCitiesAsync())
                .ThrowsAsync(new InvalidOperationException("boom"));

            var sut = CreateSut();

            // Act
            var result = await sut.GetAllCitiesAsync();

            // Assert
            var obj = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status503ServiceUnavailable, obj.StatusCode);

            _dataSvc.Verify(s => s.GetAllCitiesAsync(), Times.Once);
        }

        private sealed class FakeDbException : DbException
        {
            public FakeDbException(string message) : base(message) { }
        }

        [Fact]
        public async Task GetAllCitiesAsync_DbExceptionWithDeadlockMessage_TreatedAsTransient_Retries()
        {
            // Arrange
            var cities = new List<MyCityDto> { new MyCityDto { Id = 99 } };

            _dataSvc
                .SetupSequence(s => s.GetAllCitiesAsync())
                .ThrowsAsync(new FakeDbException("deadlock victim"))
                .ReturnsAsync(cities);

            var sut = CreateSut();

            // Act
            var result = await sut.GetAllCitiesAsync();

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
            Assert.Same(cities, ok.Value);

            _dataSvc.Verify(s => s.GetAllCitiesAsync(), Times.Exactly(2));
        }

            [Fact]
        public async Task GetCityByIdAsync_WhenFound_ReturnsOk_WithCity()
        {
            // Arrange
            const int id = 5;

            var city = new MyCityDto
            {
                Id = id
            };

            _dataSvc
                .Setup(s => s.GetCityByIdAsync(id))
                .ReturnsAsync(city);

            var sut = CreateSut();

            // Act
            var result = await sut.GetCityByIdAsync(id);

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
            Assert.Same(city, ok.Value);

            _dataSvc.Verify(s => s.GetCityByIdAsync(id), Times.Once);
        }

        [Fact]
        public async Task GetCityByIdAsync_WhenNotFound_ReturnsNotFound()
        {
            // Arrange
            const int id = 123;

            _dataSvc
                .Setup(s => s.GetCityByIdAsync(id))
                .ReturnsAsync((MyCityDto?)null);

            var sut = CreateSut();

            // Act
            var result = await sut.GetCityByIdAsync(id);

            // Assert
            Assert.IsType<NotFoundResult>(result.Result);

            _dataSvc.Verify(s => s.GetCityByIdAsync(id), Times.Once);
        }

        [Fact]
        public async Task GetCityByIdAsync_WhenDataServiceThrows_Rethrows()
        {
            // Arrange
            const int id = 7;

            _dataSvc
                .Setup(s => s.GetCityByIdAsync(id))
                .ThrowsAsync(new InvalidOperationException("boom"));

            var sut = CreateSut();

            // Act + Assert
            await Assert.ThrowsAsync<InvalidOperationException>(
                async () => await sut.GetCityByIdAsync(id)
            );

            _dataSvc.Verify(s => s.GetCityByIdAsync(id), Times.Once);
        }

        [Fact]
        public async Task CreateCityAsync_Success_ReturnsOk_WithNewId()
        {
            // Arrange
            var city = new MyCityDto
            {
                Id = 0
            };

            const int newId = 42;

            _dataSvc
                .Setup(s => s.CreateCityAsync(It.IsAny<MyCityDto>()))
                .ReturnsAsync(newId);

            var sut = CreateSut();

            // Act
            var result = await sut.CreateCityAsync(city);

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
            Assert.Equal(newId, ok.Value);

            _dataSvc.Verify(s => s.CreateCityAsync(It.Is<MyCityDto>(c => ReferenceEquals(c, city))), Times.Once);
        }

        [Fact]
        public async Task UpdateCityAsync_WhenRouteIdDoesNotMatchPayloadId_ReturnsBadRequest()
        {
            // Arrange
            const int routeId = 5;

            var city = new MyCityDto
            {
                Id = 6
            };

            var sut = CreateSut();

            // Act
            var result = await sut.UpdateCityAsync(routeId, city);

            // Assert
            var bad = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal(StatusCodes.Status400BadRequest, bad.StatusCode);
            Assert.Equal("Route id does not match payload id.", bad.Value);

            _dataSvc.Verify(s => s.UpdateCityAsync(It.IsAny<MyCityDto>()), Times.Never);
        }

        [Fact]
        public async Task UpdateCityAsync_WhenUpdateReturnsFalse_ReturnsNotFound()
        {
            // Arrange
            const int id = 5;

            var city = new MyCityDto
            {
                Id = id
            };

            _dataSvc
                .Setup(s => s.UpdateCityAsync(It.IsAny<MyCityDto>()))
                .ReturnsAsync(false);

            var sut = CreateSut();

            // Act
            var result = await sut.UpdateCityAsync(id, city);

            // Assert
            Assert.IsType<NotFoundResult>(result);

            _dataSvc.Verify(s => s.UpdateCityAsync(It.Is<MyCityDto>(c => ReferenceEquals(c, city))), Times.Once);
        }

        [Fact]
        public async Task UpdateCityAsync_WhenUpdateReturnsTrue_ReturnsNoContent()
        {
            // Arrange
            const int id = 5;

            var city = new MyCityDto
            {
                Id = id
            };

            _dataSvc
                .Setup(s => s.UpdateCityAsync(It.IsAny<MyCityDto>()))
                .ReturnsAsync(true);

            var sut = CreateSut();

            // Act
            var result = await sut.UpdateCityAsync(id, city);

            // Assert
            Assert.IsType<NoContentResult>(result);

            _dataSvc.Verify(s => s.UpdateCityAsync(It.Is<MyCityDto>(c => ReferenceEquals(c, city))), Times.Once);
        }

        [Fact]
        public async Task DeleteCityAsync_WhenDeleteReturnsFalse_ReturnsNotFound()
        {
            // Arrange
            const int id = 9;

            _dataSvc
                .Setup(s => s.DeleteCityAsync(id))
                .ReturnsAsync(false);

            var sut = CreateSut();

            // Act
            var result = await sut.DeleteCityAsync(id);

            // Assert
            Assert.IsType<NotFoundResult>(result);

            _dataSvc.Verify(s => s.DeleteCityAsync(id), Times.Once);
        }

        [Fact]
        public async Task DeleteCityAsync_WhenDeleteReturnsTrue_ReturnsNoContent()
        {
            // Arrange
            const int id = 9;

            _dataSvc
                .Setup(s => s.DeleteCityAsync(id))
                .ReturnsAsync(true);

            var sut = CreateSut();

            // Act
            var result = await sut.DeleteCityAsync(id);

            // Assert
            Assert.IsType<NoContentResult>(result);

            _dataSvc.Verify(s => s.DeleteCityAsync(id), Times.Once);
        }

    }

}
