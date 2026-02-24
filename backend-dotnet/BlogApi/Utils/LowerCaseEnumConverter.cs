using System.Text.Json;
using System.Text.Json.Serialization;

namespace BlogApi.Utils
{
    /// <summary>
    /// 自定义枚举转换器，支持小写字符串转换为枚举（兼容前端小写值）
    /// </summary>
    public class LowerCaseEnumConverter<TEnum> : JsonConverter<TEnum> where TEnum : struct, Enum
    {
        public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = reader.GetString();
            if (string.IsNullOrEmpty(value))
            {
                return default;
            }

            // 尝试将首字母大写后解析（study -> Study）
            var capitalizedValue = char.ToUpper(value[0]) + value.Substring(1).ToLower();
            
            if (Enum.TryParse<TEnum>(capitalizedValue, true, out var result))
            {
                return result;
            }

            throw new JsonException($"Unable to convert \"{value}\" to enum \"{typeof(TEnum)}\".");
        }

        public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
        {
            // 写入时转换为小写（Study -> study）
            writer.WriteStringValue(value.ToString().ToLower());
        }
    }
}
