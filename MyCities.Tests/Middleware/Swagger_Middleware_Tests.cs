using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using MyCitiesWebApi;
using System.Text;

namespace MyCities.Tests.Middleware
{
    public class Swagger_Middleware_Tests : IDisposable
    {
        private const string ValidUsername = "cal";
        private const string ValidPassword = "secret";

        private static SwaggerBasicAuthenticationMiddleware CreateSut(
            RequestDelegate next,
            string username = ValidUsername,
            string password = ValidPassword)
        {
            var settings = new SwaggerAuthenticationSettings
            {
                Username = username,
                Password = password
            };

            return new SwaggerBasicAuthenticationMiddleware(
                next,
                Options.Create(settings));
        }

        private static string CreateBasicAuthorizationHeader(
            string username,
            string password,
            string scheme = "Basic")
        {
            var credentials = $"{username}:{password}";
            var encodedCredentials =
                Convert.ToBase64String(Encoding.UTF8.GetBytes(credentials));

            return $"{scheme} {encodedCredentials}";
        }

        [Fact]
        public async Task InvokeAsync_UnprotectedPath_CallsNextMiddleware()
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = "/api/mycities/GetCityById/7";

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.True(nextWasCalled);
            Assert.NotEqual(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);
        }

        [Theory]
        [InlineData("/swagger")]
        [InlineData("/swagger/index.html")]
        [InlineData("/swagger/v1/swagger.json")]
        [InlineData("/api/debugging")]
        [InlineData("/api/debugging/GetEnvironmentInfo")]
        public async Task InvokeAsync_ProtectedPathWithValidCredentials_CallsNextMiddleware(
            string path)
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = path;
            context.Request.Headers.Authorization =
                CreateBasicAuthorizationHeader(
                    ValidUsername,
                    ValidPassword);

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.True(nextWasCalled);
            Assert.NotEqual(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);
        }

        [Theory]
        [InlineData("/swagger")]
        [InlineData("/api/debugging")]
        public async Task InvokeAsync_ProtectedPathWithoutAuthorizationHeader_Returns401(
            string path)
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = path;
            context.Response.Body = new MemoryStream();

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.False(nextWasCalled);

            Assert.Equal(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);

            Assert.Equal(
                "Basic realm=\"MyCities Swagger\"",
                context.Response.Headers.WWWAuthenticate.ToString());

            context.Response.Body.Position = 0;

            using var reader = new StreamReader(context.Response.Body);
            var body = await reader.ReadToEndAsync();

            Assert.Equal("Unauthorized", body);
        }

        [Fact]
        public async Task InvokeAsync_ProtectedPathWithIncorrectCredentials_Returns401()
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = "/swagger";
            context.Response.Body = new MemoryStream();

            context.Request.Headers.Authorization =
                CreateBasicAuthorizationHeader(
                    ValidUsername,
                    "wrong-password");

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.False(nextWasCalled);

            Assert.Equal(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);
        }

        [Fact]
        public async Task InvokeAsync_ProtectedPathWithMalformedBase64_Returns401()
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = "/swagger";
            context.Response.Body = new MemoryStream();

            context.Request.Headers.Authorization =
                "Basic definitely-not-base64!";

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.False(nextWasCalled);

            Assert.Equal(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);
        }

        [Fact]
        public async Task InvokeAsync_PasswordContainingColon_WithMatchingCredentials_CallsNextMiddleware()
        {
            // Arrange
            const string passwordWithColon = "part1:part2";

            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(
                next,
                ValidUsername,
                passwordWithColon);

            var context = new DefaultHttpContext();
            context.Request.Path = "/swagger";

            context.Request.Headers.Authorization =
                CreateBasicAuthorizationHeader(
                    ValidUsername,
                    passwordWithColon);

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.True(nextWasCalled);
        }

        [Fact]
        public async Task InvokeAsync_LowercaseBasicScheme_WithValidCredentials_CallsNextMiddleware()
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = "/swagger";

            context.Request.Headers.Authorization =
                CreateBasicAuthorizationHeader(
                    ValidUsername,
                    ValidPassword,
                    scheme: "basic");

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.True(nextWasCalled);
        }

        [Fact]
        public async Task InvokeAsync_NonBasicAuthorizationScheme_Returns401()
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = "/swagger";
            context.Response.Body = new MemoryStream();

            context.Request.Headers.Authorization =
                "Bearer abc123";

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.False(nextWasCalled);

            Assert.Equal(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);
        }

        [Fact]
        public async Task InvokeAsync_UnparseableAuthorizationHeader_Returns401()
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = "/swagger";
            context.Response.Body = new MemoryStream();

            context.Request.Headers.Authorization = ":";

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.False(nextWasCalled);
            Assert.Equal(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);
        }

        [Fact]
        public async Task InvokeAsync_BasicSchemeWithoutCredentials_Returns401()
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = "/swagger";
            context.Response.Body = new MemoryStream();

            context.Request.Headers.Authorization = "Basic";

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.False(nextWasCalled);
            Assert.Equal(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);
        }

        [Fact]
        public async Task InvokeAsync_DecodedCredentialsWithoutColon_Returns401()
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = "/swagger";
            context.Response.Body = new MemoryStream();

            var encodedCredentials = Convert.ToBase64String(
                Encoding.UTF8.GetBytes("usernameOnly"));

            context.Request.Headers.Authorization =
                $"Basic {encodedCredentials}";

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.False(nextWasCalled);
            Assert.Equal(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);
        }

        [Fact]
        public async Task InvokeAsync_IncorrectUsernameWithCorrectPassword_Returns401()
        {
            // Arrange
            var nextWasCalled = false;

            RequestDelegate next = context =>
            {
                nextWasCalled = true;
                return Task.CompletedTask;
            };

            var sut = CreateSut(next);

            var context = new DefaultHttpContext();
            context.Request.Path = "/swagger";
            context.Response.Body = new MemoryStream();

            context.Request.Headers.Authorization =
                CreateBasicAuthorizationHeader(
                    "wrong-user",
                    ValidPassword);

            // Act
            await sut.InvokeAsync(context);

            // Assert
            Assert.False(nextWasCalled);
            Assert.Equal(
                StatusCodes.Status401Unauthorized,
                context.Response.StatusCode);
        }


        public void Dispose()
        {
            
        }
    }
}
