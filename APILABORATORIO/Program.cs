using APILABORATORIO.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json.Serialization;
using QuestPDF.Infrastructure;
using Microsoft.AspNetCore.Builder;

var builder = WebApplication.CreateBuilder(args);

// Configuración inicial
QuestPDF.Settings.License = LicenseType.Community;

// Configuración de la base de datos
builder.Services.AddDbContext<LaboratorioClinicoContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("connectionDb"))
           .LogTo(Console.WriteLine, LogLevel.Information));

// Configuración de controladores
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.Preserve;
    });

// Configuración de JWT
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.ASCII.GetBytes(jwtSettings["Key"]);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

// Configuración de CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configuración detallada de Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Laboratorio Clínico API",
        Version = "v1",
        Description = "API para gestión de laboratorio clínico"
    });

    // Configuración para JWT en Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5090);
});
var app = builder.Build();

// Configuración del pipeline HTTP
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Laboratorio Clínico API v1");
    c.RoutePrefix = string.Empty; // Swagger en la raíz
});

app.UseRouting();

// IMPORTANTE: UseCors debe estar después de UseRouting y antes de otros middlewares
app.UseCors("AllowAll");

// IMPORTANTE: UseAuthentication antes de UseAuthorization
app.UseAuthentication();
app.UseAuthorization();

// Comenta esto para desarrollo si quieres evitar redirección a HTTPS
// app.UseHttpsRedirection();

app.MapControllers();

// Configuración específica del puerto
app.Run();