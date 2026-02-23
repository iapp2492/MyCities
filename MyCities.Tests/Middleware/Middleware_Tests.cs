using Microsoft.AspNetCore.Http;
using Serilog;
using Serilog.Core;
using Serilog.Events;
using System.Text.Json;
using MyCitiesWebApi.Middleware;

namespace MyCities.Tests.Middleware
{
    public class Middleware_Tests : IDisposable
    {
        private readonly ILogger _originalLogger;

        public Middleware_Tests()
        {
            _originalLogger = Log.Logger;
        }

        public void Dispose()
        {
            Log.Logger = _originalLogger;
        }

        [Fact]
        public async Task InvokeAsync_WhenNextThrows_Returns500JsonWithTraceId()
        {
            // Arrange
            var sink = new CollectingSink();
            Log.Logger = new LoggerConfiguration()
                .Enrich.FromLogContext()
                .MinimumLevel.Verbose()
                .WriteTo.Sink(sink)
                .CreateLogger();

            RequestDelegate next = _ => throw new InvalidOperationException("boom");
            var middleware = new GlobalExceptionMiddleware(next);

            var context = new DefaultHttpContext();
            context.TraceIdentifier = "trace-123";
            context.Request.Path = "/api/MyCities/GetAllCities";
            context.Response.Body = new MemoryStream();

            // Act
            await middleware.InvokeAsync(context);

            // Assert - response
            context.Response.Body.Position = 0;

            string body;
            using (var reader = new StreamReader(context.Response.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode); 
            Assert.NotNull(context.Response.ContentType);
            Assert.StartsWith("application/json", context.Response.ContentType, StringComparison.OrdinalIgnoreCase);


            using (var doc = JsonDocument.Parse(body))
            {
                JsonElement traceIdElement;

                var found =
                    doc.RootElement.TryGetProperty("traceId", out traceIdElement) ||
                    doc.RootElement.TryGetProperty("TraceId", out traceIdElement);

                Assert.True(found, "Response JSON did not contain a traceId/TraceId property.");
                Assert.False(string.IsNullOrWhiteSpace(traceIdElement.GetString()));
            }

            // Assert - log
            var logEvent = sink.Events.Single();
            Assert.Equal(LogEventLevel.Error, logEvent.Level);

            // Your middleware logs "Unhandled exception occurred."
            Assert.Equal("Unhandled exception occurred.", logEvent.MessageTemplate.Text);

            // Exception should be attached
            Assert.NotNull(logEvent.Exception);
            Assert.IsType<InvalidOperationException>(logEvent.Exception);
        }

        [Fact]
        public async Task InvokeAsync_WhenNextThrows_LogsControllerActionEndpointAndRequestPath()
        {
            // Arrange
            var sink = new CollectingSink();
            Log.Logger = new LoggerConfiguration()
                .Enrich.FromLogContext()
                .MinimumLevel.Verbose()
                .WriteTo.Sink(sink)
                .CreateLogger();

            RequestDelegate next = _ => throw new Exception("fail");
            var middleware = new GlobalExceptionMiddleware(next);

            var context = new DefaultHttpContext();
            context.TraceIdentifier = "trace-999";
            context.Request.Path = "/api/Debugging/GetEnvironmentInfo";
            context.Response.Body = new MemoryStream();

            context.Request.RouteValues["controller"] = "Debugging";
            context.Request.RouteValues["action"] = "GetEnvironmentInfo";

            var endpoint = new Endpoint(
                requestDelegate: _ => Task.CompletedTask,
                metadata: new EndpointMetadataCollection(),
                displayName: "MyCitiesWebApi.Controllers.DebuggingController.GetEnvironmentInfo (MyCitiesWebApi)"
            );
            context.SetEndpoint(endpoint);

            // Act
            await middleware.InvokeAsync(context);

            // Assert - log properties enriched by LogContext
            var logEvent = sink.Events.Single();

            AssertPropertyEquals(logEvent, "TraceId", "trace-999");
            AssertPropertyEquals(logEvent, "RequestPath", "/api/Debugging/GetEnvironmentInfo");
            AssertPropertyEquals(logEvent, "Controller", "Debugging");
            AssertPropertyEquals(logEvent, "Action", "GetEnvironmentInfo");
            AssertPropertyEquals(logEvent, "EndpointName", "MyCitiesWebApi.Controllers.DebuggingController.GetEnvironmentInfo (MyCitiesWebApi)");
        }

        private static void AssertPropertyEquals(LogEvent logEvent, string propertyName, string expectedValue)
        {
            Assert.True(logEvent.Properties.TryGetValue(propertyName, out var value), $"Missing property '{propertyName}'.");

            var scalar = Assert.IsType<ScalarValue>(value);
            Assert.Equal(expectedValue, scalar.Value?.ToString());
        }

        private sealed class CollectingSink : ILogEventSink
        {
            private readonly List<LogEvent> _events = new List<LogEvent>();

            public IReadOnlyList<LogEvent> Events => _events;

            public void Emit(LogEvent logEvent)
            {
                _events.Add(logEvent);
            }
        }
    }
}
