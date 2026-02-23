using Serilog.Context;
using Serilog;
using System.Net;

namespace MyCitiesWebApi.Middleware
{
    public sealed class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly Serilog.ILogger _logger;

        public GlobalExceptionMiddleware(RequestDelegate next)
        {
            _next = next;
            _logger = Log.ForContext<GlobalExceptionMiddleware>();
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                var endpoint = context.GetEndpoint();
                var endpointName = endpoint?.DisplayName;

                var controller = context.Request.RouteValues.TryGetValue("controller", out var c)
                    ? c?.ToString()
                    : null;

                var action = context.Request.RouteValues.TryGetValue("action", out var a)
                    ? a?.ToString()
                    : null;

                using (LogContext.PushProperty("TraceId", context.TraceIdentifier))
                using (LogContext.PushProperty("RequestPath", context.Request.Path.Value))
                using (LogContext.PushProperty("Controller", controller))
                using (LogContext.PushProperty("Action", action))
                using (LogContext.PushProperty("EndpointName", endpointName))
                {
                    _logger.Error(ex, "Unhandled exception occurred.");
                }

                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                context.Response.ContentType = "application/json";

                await context.Response.WriteAsJsonAsync(new
                {
                    message = "An unexpected error occurred.",
                    traceId = context.TraceIdentifier
                });
            }
        }
    }
}
