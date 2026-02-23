using MyCitiesDataAccess;
using Serilog;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using MyCitiesDataAccess.Contexts;
using Serilog.Events;
using Serilog.Sinks.MSSqlServer;
using System.Data;
using MyCitiesWebApi.Filters;
using MyCitiesWebApi.Middleware;

namespace MyCitiesWebApi
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            #region Host Configuration


            builder.Host.UseSerilog((context, services, loggerConfiguration) =>
            {
                var connectionString = context.Configuration.GetConnectionString("MyCities");

                var sinkOptions = new MSSqlServerSinkOptions
                {
                    TableName = "log",
                    SchemaName = "dbo",
                    AutoCreateSqlTable = false
                };

                var columnOptions = new ColumnOptions();

                // Keep the standard columns
                columnOptions.Store.Remove(StandardColumn.Properties);
                columnOptions.Store.Remove(StandardColumn.LogEvent);

                // Put them back as NVARCHAR(MAX) (optional; include if you want full structured payload stored)
                columnOptions.Store.Add(StandardColumn.Properties);
                columnOptions.Store.Add(StandardColumn.LogEvent);

                columnOptions.Properties.ExcludeAdditionalProperties = false;
                columnOptions.AdditionalColumns = new List<SqlColumn>
                {
                    new SqlColumn { ColumnName = "Application",   DataType = SqlDbType.NVarChar, DataLength = 64 },
                    new SqlColumn { ColumnName = "Environment",   DataType = SqlDbType.NVarChar, DataLength = 32 },
                    new SqlColumn { ColumnName = "TraceId",       DataType = SqlDbType.NVarChar, DataLength = 64 },
                    new SqlColumn { ColumnName = "RequestPath",   DataType = SqlDbType.NVarChar, DataLength = 256 },
                    new SqlColumn { ColumnName = "Controller",    DataType = SqlDbType.NVarChar, DataLength = 128 },
                    new SqlColumn { ColumnName = "Action",        DataType = SqlDbType.NVarChar, DataLength = 128 },
                    new SqlColumn { ColumnName = "Method",        DataType = SqlDbType.NVarChar, DataLength = 256 },
                    new SqlColumn { ColumnName = "Args",          DataType = SqlDbType.NVarChar, DataLength = -1 }
                };

                loggerConfiguration
                    .MinimumLevel.Information()
                    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
                    .Enrich.FromLogContext()
                    .Enrich.WithProperty("Application", "MyCities")
                    .Enrich.WithProperty("Environment", context.HostingEnvironment.EnvironmentName)
                    .WriteTo.MSSqlServer(
                        connectionString: connectionString,
                        sinkOptions: sinkOptions,
                        columnOptions: columnOptions);
            });

            #endregion


            #region Service Registration


            #region Framework Services


            builder.Services.AddControllers();

            // Swagger (Development only at runtime, but registration is fine always)
            builder.Services.AddEndpointsApiExplorer(); // Collects metadata about every endpoint contained in the app
            builder.Services.AddSwaggerGen(); // “When someone requests /swagger/v1/swagger.json, dynamically generate an OpenAPI document describing the API.”

            //CORS policies
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAnyOrigin", p =>
                    p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

                options.AddPolicy("AllowOnlyMyCities", p =>
                    p.WithOrigins("https://www.mycities.example") // change later after deployment
                     .AllowAnyMethod()
                     .AllowAnyHeader());
            });

            #endregion

            #region Application Service


            // ***************************************************************************//

            // The following will load the data for this application from the Excel file 
            // This was used during initial development but has now been replaced by
            // the EF-based service that reads from the SQL database.
            // builder.Services.Configure<MyCitiesDataOptions>(
            // builder.Configuration.GetSection("MyCitiesData"));
            // builder.Services.AddSingleton<IMyCitiesDataService>(sp =>
            // {
            //    var env = sp.GetRequiredService<IWebHostEnvironment>();
            //    var opts = sp.GetRequiredService<IOptions<MyCitiesDataOptions>>().Value;
            //    var logger = sp.GetRequiredService<ILogger<ExcelMyCitiesDataService>>();

            //    var fullPath = Path.Combine(env.ContentRootPath, opts.ExcelFilePath);

            //    return new ExcelMyCitiesDataService(fullPath, opts.WorksheetName, logger);
            // });

            // ***************************************************************************//

            //DataAccess 
            builder.Services.AddDbContext<MyCitiesDbContext>(options =>
            {
                options.UseSqlServer(builder.Configuration.GetConnectionString("MyCities"));
            });

            builder.Services.AddScoped<IMyCitiesDataService, EfMyCitiesDataService>();

            builder.Services
                .AddOptions<MyCitiesSettings>()
                .Bind(builder.Configuration.GetSection("MyCitiesSettings"))
                .ValidateOnStart();

            builder.Services.AddControllers(options =>
            {
                options.Filters.Add<SerilogActionEnricherFilter>();
            });


            #endregion


            #endregion

            #region Middleware Pipeline

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            app.UsePathBase("/mycities/dataservice");

            app.UseSerilogRequestLogging(options =>
            {
                options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
                {
                    diagnosticContext.Set("TraceId", httpContext.TraceIdentifier);
                    diagnosticContext.Set("RequestPath", httpContext.Request.Path.Value);

                    var endpoint = httpContext.GetEndpoint();
                    if (endpoint != null)
                    {
                        diagnosticContext.Set("EndpointName", endpoint.DisplayName);
                    }
                };
            });

            app.UseMiddleware<GlobalExceptionMiddleware>();

            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                // Swagger will be served from /mycities/dataservice/swagger/index.html
                c.SwaggerEndpoint("v1/swagger.json", "MyCities API v1");
                c.RoutePrefix = "swagger"; // default; swagger UI at /swagger
            });

            app.UseHttpsRedirection();

            app.UseCors();

            app.UseAuthorization();

            app.MapControllers();

            // Open Swagger UI automatically in development mode
            if (app.Environment.IsDevelopment())
            {
                app.Lifetime.ApplicationStarted.Register(() =>
                {
                    var url = app.Urls.FirstOrDefault() ?? "https://localhost:5001";
                    var swaggerUrl = $"{url.TrimEnd('/')}/swagger";

                    try
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = swaggerUrl,
                            UseShellExecute = true
                        });
                    }
                    catch
                    {
                        // ignore
                    }
                });
            }


            app.Run();

            #endregion
        }

    }
}
