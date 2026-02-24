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

        public GalleryController(GalleryService galleryService)
        {
            _galleryService = galleryService;
        }

        // 公开接口：获取所有激活的画廊图片
        [HttpGet]
        public async Task<ActionResult<List<Gallery>>> GetAllActive()
        {
            var galleries = await _galleryService.GetAllActiveAsync();
            return Ok(galleries);
        }

        // 管理员接口：获取所有画廊图片
        [Authorize]
        [HttpGet("admin")]
        public async Task<ActionResult<List<Gallery>>> GetAll()
        {
            var galleries = await _galleryService.GetAllAsync();
            return Ok(galleries);
        }

        // 管理员接口：获取单个画廊图片
        [Authorize]
        [HttpGet("{id}")]
        public async Task<ActionResult<Gallery>> GetById(int id)
        {
            var gallery = await _galleryService.GetByIdAsync(id);
            if (gallery == null)
                return NotFound();

            return Ok(gallery);
        }

        // 公开接口：获取图片宽高
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

        // 管理员接口：刷新所有图片宽高
        [Authorize]
        [HttpPost("refresh-dimensions")]
        public async Task<ActionResult<GalleryRefreshResultDto>> RefreshDimensions()
        {
            var result = await _galleryService.RefreshAllDimensionsAsync();
            return Ok(result);
        }

        // 管理员接口：创建画廊图片
        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Gallery>> Create([FromBody] CreateGalleryDto dto)
        {
            var gallery = await _galleryService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = gallery.Id }, gallery);
        }

        // 管理员接口：更新画廊图片
        [Authorize]
        [HttpPatch("{id}")]
        public async Task<ActionResult<Gallery>> Update(int id, [FromBody] UpdateGalleryDto dto)
        {
            var gallery = await _galleryService.UpdateAsync(id, dto);
            if (gallery == null)
                return NotFound();

            return Ok(gallery);
        }

        // 管理员接口：删除画廊图片
        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _galleryService.DeleteAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }

        // 管理员接口：批量更新排序
        [Authorize]
        [HttpPatch("batch/sort-order")]
        public async Task<IActionResult> UpdateSortOrder([FromBody] List<UpdateSortOrderDto> updates)
        {
            await _galleryService.UpdateSortOrderAsync(updates);
            return Ok(new { message = "排序更新成功" });
        }

        // 管理员接口：切换激活状态
        [Authorize]
        [HttpPatch("{id}/toggle-active")]
        public async Task<ActionResult<Gallery>> ToggleActive(int id)
        {
            var gallery = await _galleryService.ToggleActiveAsync(id);
            if (gallery == null)
                return NotFound();

            return Ok(gallery);
        }

        // 管理员接口：批量导入图片
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
