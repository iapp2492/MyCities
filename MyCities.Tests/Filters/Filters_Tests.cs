using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using MyCitiesWebApi.Filters;
using Serilog;
using Serilog.Core;
using Serilog.Events;

namespace MyCities.Tests.Filters
{
    public sealed class Filters_Tests
    {
        [Fact]
        public async Task SerilogActionEnricherFilter_Enriches_LogContext_For_Action_Only()
        {
            // Arrange
            var sink = new InMemorySink();

            var originalLogger = Log.Logger;

            try
            {
                Log.Logger = new LoggerConfiguration()
                    .MinimumLevel.Verbose()
                    .Enrich.FromLogContext()
                    .WriteTo.Sink(sink)
                    .CreateLogger();

                var httpContext = new DefaultHttpContext();
                httpContext.TraceIdentifier = "trace-123";
                httpContext.Request.Path = "/api/MyCities/GetAllCities";

                var routeData = new RouteData();
                routeData.Values["controller"] = "MyCities";
                routeData.Values["action"] = "GetAllCities";

                var actionDescriptor = new ActionDescriptor();
                actionDescriptor.RouteValues["controller"] = "MyCities";
                actionDescriptor.RouteValues["action"] = "GetAllCities";

                var actionContext = new Microsoft.AspNetCore.Mvc.ActionContext(
                    httpContext,
                    routeData,
                    actionDescriptor
                );

                var filter = new SerilogActionEnricherFilter();

                var filters = new List<IFilterMetadata>();
                var actionArguments = new Dictionary<string, object?>();
                var controllerInstance = new object();

                var executingContext = new ActionExecutingContext(
                    actionContext,
                    filters,
                    actionArguments,
                    controllerInstance
                );

                var executedContext = new ActionExecutedContext(
                    actionContext,
                    filters,
                    controllerInstance
                );

                // Act
                await filter.OnActionExecutionAsync(
                    executingContext,
                    async () =>
                    {
                        Log.Information("Inside action");
                        return await Task.FromResult(executedContext);
                    }
                );

                Log.Information("Outside action");

                // Assert
                Assert.True(sink.Events.Count >= 2);

                var inside = sink.Events.Single(e => e.MessageTemplate.Text == "Inside action");
                AssertPropertyEquals(inside, "Controller", "MyCities");
                AssertPropertyEquals(inside, "Action", "GetAllCities");
                AssertPropertyEquals(inside, "TraceId", "trace-123");
                AssertPropertyEquals(inside, "RequestPath", "/api/MyCities/GetAllCities");

                var outside = sink.Events.Single(e => e.MessageTemplate.Text == "Outside action");
                Assert.False(outside.Properties.ContainsKey("Controller"));
                Assert.False(outside.Properties.ContainsKey("Action"));
                Assert.False(outside.Properties.ContainsKey("TraceId"));
                Assert.False(outside.Properties.ContainsKey("RequestPath"));
            }
            finally
            {
                Log.Logger = originalLogger;
            }
        }

        [Fact]
        public async Task SerilogActionEnricherFilter_Allows_Null_Controller_And_Action()
        {
            // Arrange
            var sink = new InMemorySink();

            var originalLogger = Log.Logger;

            try
            {
                Log.Logger = new LoggerConfiguration()
                    .MinimumLevel.Verbose()
                    .Enrich.FromLogContext()
                    .WriteTo.Sink(sink)
                    .CreateLogger();

                var httpContext = new DefaultHttpContext();
                httpContext.TraceIdentifier = "trace-xyz";
                httpContext.Request.Path = "/api/Debugging/GetEnvironmentInfo";

                var routeData = new RouteData();

                var actionDescriptor = new ActionDescriptor();
                // Intentionally NOT setting controller/action route values.

                var actionContext = new Microsoft.AspNetCore.Mvc.ActionContext(
                    httpContext,
                    routeData,
                    actionDescriptor
                );

                var filter = new SerilogActionEnricherFilter();

                var filters = new List<IFilterMetadata>();
                var actionArguments = new Dictionary<string, object?>();
                var controllerInstance = new object();

                var executingContext = new ActionExecutingContext(
                    actionContext,
                    filters,
                    actionArguments,
                    controllerInstance
                );

                var executedContext = new ActionExecutedContext(
                    actionContext,
                    filters,
                    controllerInstance
                );

                // Act
                await filter.OnActionExecutionAsync(
                    executingContext,
                    async () =>
                    {
                        Log.Information("Inside action (null controller/action)");
                        return await Task.FromResult(executedContext);
                    }
                );

                // Assert
                var inside = sink.Events.Single(e => e.MessageTemplate.Text == "Inside action (null controller/action)");
                AssertPropertyIsNull(inside, "Controller");
                AssertPropertyIsNull(inside, "Action");
                AssertPropertyEquals(inside, "TraceId", "trace-xyz");
                AssertPropertyEquals(inside, "RequestPath", "/api/Debugging/GetEnvironmentInfo");
            }
            finally
            {
                Log.Logger = originalLogger;
            }
        }

        private static void AssertPropertyEquals(LogEvent logEvent, string name, string expected)
        {
            Assert.True(logEvent.Properties.TryGetValue(name, out var value));

            var scalar = Assert.IsType<ScalarValue>(value);
            Assert.Equal(expected, scalar.Value);
        }

        private static void AssertPropertyIsNull(LogEvent logEvent, string name)
        {
            Assert.True(logEvent.Properties.TryGetValue(name, out var value));

            var scalar = Assert.IsType<ScalarValue>(value);
            Assert.Null(scalar.Value);
        }

        private sealed class InMemorySink : ILogEventSink
        {
            public List<LogEvent> Events { get; } = new List<LogEvent>();

            public void Emit(LogEvent logEvent)
            {
                Events.Add(logEvent);
            }
        }
    }
}
