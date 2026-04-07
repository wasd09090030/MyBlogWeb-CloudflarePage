using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BlogApi.Services;
using BlogApi.DTOs;
using BlogApi.Models;

namespace BlogApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GalleryController : ControllerBase
    {
        private readonly GalleryService _galleryService;

        /// <summary>
        /// 初始化画廊控制器，注入画廊业务服务。
        /// </summary>
        public GalleryController(GalleryService galleryService)
        {
            _galleryService = galleryService;
        }

        /// <summary>
        /// 获取所有已激活的画廊图片（公开接口）。
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<Gallery>>> GetAllActive()
        {
            var galleries = await _galleryService.GetAllActiveAsync();
            return Ok(galleries);
        }

        /// <summary>
        /// 获取全部画廊图片（管理员接口）。
        /// </summary>
        [Authorize]
        [HttpGet("admin")]
        public async Task<ActionResult<List<Gallery>>> GetAll()
        {
            var galleries = await _galleryService.GetAllAsync();
            return Ok(galleries);
        }

        /// <summary>
        /// 根据 ID 获取画廊图片详情（管理员接口）。
        /// </summary>
        [Authorize]
        [HttpGet("{id}")]
        public async Task<ActionResult<Gallery>> GetById(int id)
        {
            var gallery = await _galleryService.GetByIdAsync(id);
            if (gallery == null)
                return NotFound();

            return Ok(gallery);
        }

        /// <summary>
        /// 获取指定图片宽高信息（公开接口）。
        /// </summary>
        [HttpGet("{id}/dimensions")]
        public async Task<ActionResult<GalleryDimensionsDto>> GetDimensions(int id)
        {
            var gallery = await _galleryService.GetByIdAsync(id);
            if (gallery == null)
                return NotFound();

            return Ok(new GalleryDimensionsDto
            {
                Id = gallery.Id,
                ImageWidth = gallery.ImageWidth,
                ImageHeight = gallery.ImageHeight
            });
        }

        /// <summary>
        /// 刷新全部画廊图片宽高数据（管理员接口）。
        /// </summary>
        [Authorize]
        [HttpPost("refresh-dimensions")]
        public async Task<ActionResult<GalleryRefreshResultDto>> RefreshDimensions()
        {
            var result = await _galleryService.RefreshAllDimensionsAsync();
            return Ok(result);
        }

        /// <summary>
        /// 创建新的画廊图片记录（管理员接口）。
        /// </summary>
        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Gallery>> Create([FromBody] CreateGalleryDto dto)
        {
            var gallery = await _galleryService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = gallery.Id }, gallery);
        }

        /// <summary>
        /// 更新指定画廊图片信息（管理员接口）。
        /// </summary>
        [Authorize]
        [HttpPatch("{id}")]
        public async Task<ActionResult<Gallery>> Update(int id, [FromBody] UpdateGalleryDto dto)
        {
            var gallery = await _galleryService.UpdateAsync(id, dto);
            if (gallery == null)
                return NotFound();

            return Ok(gallery);
        }

        /// <summary>
        /// 删除指定画廊图片（管理员接口）。
        /// </summary>
        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _galleryService.DeleteAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }

        /// <summary>
        /// 批量更新画廊图片排序值（管理员接口）。
        /// </summary>
        [Authorize]
        [HttpPatch("batch/sort-order")]
        public async Task<IActionResult> UpdateSortOrder([FromBody] List<UpdateSortOrderDto> updates)
        {
            await _galleryService.UpdateSortOrderAsync(updates);
            return Ok(new { message = "排序更新成功" });
        }

        /// <summary>
        /// 切换指定画廊图片激活状态（管理员接口）。
        /// </summary>
        [Authorize]
        [HttpPatch("{id}/toggle-active")]
        public async Task<ActionResult<Gallery>> ToggleActive(int id)
        {
            var gallery = await _galleryService.ToggleActiveAsync(id);
            if (gallery == null)
                return NotFound();

            return Ok(gallery);
        }

        /// <summary>
        /// 批量导入画廊图片（管理员接口）。
        /// </summary>
        [Authorize]
        [HttpPost("batch/import")]
        public async Task<ActionResult<List<Gallery>>> BatchImport([FromBody] BatchImportGalleryDto dto)
        {
            if (dto.ImageUrls == null || !dto.ImageUrls.Any())
                return BadRequest(new { message = "请提供至少一个图片URL" });

            var galleries = await _galleryService.BatchImportAsync(dto);
            return Ok(new { 
                message = $"成功导入 {galleries.Count} 张图片",
                data = galleries 
            });
        }
    }
}
