using System.Data;
using BlogApi.Data;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Services
{
    public class DatabaseSchemaService
    {
        private readonly BlogDbContext _dbContext;

        public DatabaseSchemaService(BlogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task ApplyAsync(CancellationToken cancellationToken = default)
        {
            var connection = _dbContext.Database.GetDbConnection();
            var shouldCloseConnection = connection.State == ConnectionState.Closed;

            if (shouldCloseConnection)
            {
                await connection.OpenAsync(cancellationToken);
            }

            try
            {
                await ExecuteNonQueryAsync(
                    """
                    CREATE TABLE IF NOT EXISTS image_assets (
                        Id INTEGER PRIMARY KEY AUTOINCREMENT,
                        publicId TEXT NOT NULL,
                        storageKey TEXT NOT NULL,
                        sourceUrl TEXT NULL,
                        contentType TEXT NULL,
                        version INTEGER NOT NULL DEFAULT 1,
                        kind TEXT NOT NULL DEFAULT 'other',
                        isActive INTEGER NOT NULL DEFAULT 1,
                        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    """,
                    cancellationToken);

                await ExecuteNonQueryAsync(
                    "CREATE UNIQUE INDEX IF NOT EXISTS IX_image_assets_publicId ON image_assets (publicId);",
                    cancellationToken);

                await ExecuteNonQueryAsync(
                    "CREATE INDEX IF NOT EXISTS IX_image_assets_storageKey ON image_assets (storageKey);",
                    cancellationToken);

                if (!await TableExistsAsync("articles", cancellationToken))
                {
                    throw new InvalidOperationException("Cannot apply image asset schema upgrade because required table 'articles' does not exist. Recreate the database or run the full database initialization first.");
                }

                if (!await ColumnExistsAsync("articles", "coverImageAssetId", cancellationToken))
                {
                    await ExecuteNonQueryAsync(
                        "ALTER TABLE articles ADD COLUMN coverImageAssetId INTEGER NULL;",
                        cancellationToken);
                }
            }
            finally
            {
                if (shouldCloseConnection)
                {
                    await connection.CloseAsync();
                }
            }
        }

        private async Task<bool> TableExistsAsync(string tableName, CancellationToken cancellationToken)
        {
            var connection = _dbContext.Database.GetDbConnection();
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT name FROM sqlite_master WHERE type = 'table' AND name = $tableName;";

            var tableNameParameter = command.CreateParameter();
            tableNameParameter.ParameterName = "$tableName";
            tableNameParameter.Value = tableName;
            command.Parameters.Add(tableNameParameter);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is string existingTableName &&
                string.Equals(existingTableName, tableName, StringComparison.OrdinalIgnoreCase);
        }

        private async Task<bool> ColumnExistsAsync(
            string tableName,
            string columnName,
            CancellationToken cancellationToken)
        {
            var connection = _dbContext.Database.GetDbConnection();
            await using var command = connection.CreateCommand();
            command.CommandText = $"PRAGMA table_info({tableName});";

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                if (reader.FieldCount > 1 &&
                    string.Equals(reader.GetString(1), columnName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private async Task ExecuteNonQueryAsync(string sql, CancellationToken cancellationToken)
        {
            var connection = _dbContext.Database.GetDbConnection();
            await using var command = connection.CreateCommand();
            command.CommandText = sql;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }
}