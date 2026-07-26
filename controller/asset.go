package controller

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func ListAssetGroups(c *gin.Context) {
	page := parsePositiveInt(c.DefaultQuery("p", "1"), 1)
	pageSize := parsePositiveInt(c.DefaultQuery("page_size", "20"), 20)
	if pageSize > 100 {
		pageSize = 100
	}

	groups, total, err := model.ListAssetGroups(c.GetInt("id"), model.AssetGroupListParams{
		Page:      page,
		PageSize:  pageSize,
		GroupType: c.Query("group_type"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	if groups == nil {
		groups = []model.AssetGroup{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items":     groups,
			"page":      page,
			"page_size": pageSize,
			"total":     total,
		},
	})
}

func GetAssetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    service.GetAssetConfig(),
	})
}

func GetAssetGroupDetails(c *gin.Context) {
	groupID, err := strconv.ParseInt(c.Param("group_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid group_id"})
		return
	}

	userID := c.GetInt("id")
	group, err := model.GetAssetGroup(userID, groupID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "asset group not found"})
		return
	}

	assets, _, err := model.ListAssets(userID, groupID, model.AssetListParams{
		Page:     1,
		PageSize: 12,
		Sort:     "created_desc",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	if assets == nil {
		assets = []model.Asset{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"group":  group,
			"assets": assets,
		},
	})
}

func ListAssets(c *gin.Context) {
	groupID, err := strconv.ParseInt(c.Param("group_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid group_id"})
		return
	}

	userID := c.GetInt("id")
	if _, err := model.GetAssetGroup(userID, groupID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "asset group not found"})
		return
	}

	page := parsePositiveInt(c.DefaultQuery("p", "1"), 1)
	pageSize := parsePositiveInt(c.DefaultQuery("page_size", "12"), 12)
	if pageSize > 100 {
		pageSize = 100
	}
	assets, total, err := model.ListAssets(userID, groupID, model.AssetListParams{
		Page:      page,
		PageSize:  pageSize,
		Query:     c.Query("q"),
		AssetType: c.Query("asset_type"),
		Status:    c.Query("status"),
		Sort:      c.DefaultQuery("sort", "created_desc"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	if assets == nil {
		assets = []model.Asset{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"items":     assets,
			"page":      page,
			"page_size": pageSize,
			"total":     total,
		},
	})
}

func CreateAssetGroup(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		GroupType   string `json:"group_type"`
		ProjectName string `json:"project_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if req.GroupType == "" {
		req.GroupType = "AIGC"
	}
	if req.ProjectName == "" {
		req.ProjectName = "default"
	}
	now := common.GetTimestamp()
	group := &model.AssetGroup{
		UserID:          c.GetInt("id"),
		ProviderGroupID: "group-" + common.GetTimeString() + "-" + common.GetRandomString(5),
		Name:            strings.TrimSpace(req.Name),
		Description:     strings.TrimSpace(req.Description),
		GroupType:       req.GroupType,
		ProjectName:     req.ProjectName,
		CreatedTime:     now,
		UpdatedTime:     now,
	}
	if err := model.CreateAssetGroup(group); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": group})
}

func DeleteAssetGroup(c *gin.Context) {
	groupID, err := strconv.ParseInt(c.Param("group_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid group_id"})
		return
	}
	if err := model.DeleteAssetGroup(c.GetInt("id"), groupID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func CreateAsset(c *gin.Context) {
	groupID, err := strconv.ParseInt(c.Param("group_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid group_id"})
		return
	}
	userID := c.GetInt("id")
	if _, err := model.GetAssetGroup(userID, groupID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "asset group not found"})
		return
	}

	var asset *model.Asset
	if strings.HasPrefix(c.GetHeader("Content-Type"), "multipart/form-data") {
		asset, err = createUploadedAsset(c, userID, groupID)
	} else {
		asset, err = createURLAsset(c, userID, groupID)
	}
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if err := model.CreateAsset(asset); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": asset})
}

func createUploadedAsset(c *gin.Context, userID int, groupID int64) (*model.Asset, error) {
	file, err := c.FormFile("file")
	if err != nil {
		return nil, fmt.Errorf("file is required: %w", err)
	}
	config := service.GetAssetConfig()
	if file.Size > config.MaxFileBytes {
		return nil, fmt.Errorf("file exceeds maximum size")
	}
	assetType := assetTypeFromExtension(filepath.Ext(file.Filename))
	if assetType == "" {
		return nil, fmt.Errorf("unsupported file type")
	}
	return newLocalAsset(userID, groupID, file.Filename, assetType, file.Header.Get("Content-Type"), file.Size, ""), nil
}

func createURLAsset(c *gin.Context, userID int, groupID int64) (*model.Asset, error) {
	var req struct {
		URL       string `json:"url" binding:"required,url"`
		Name      string `json:"name"`
		AssetType string `json:"asset_type"`
		MimeType  string `json:"mime_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		return nil, err
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = filepath.Base(req.URL)
	}
	if req.AssetType == "" {
		req.AssetType = assetTypeFromExtension(filepath.Ext(name))
	}
	if req.AssetType == "" {
		return nil, fmt.Errorf("asset_type is required")
	}
	return newLocalAsset(userID, groupID, name, req.AssetType, req.MimeType, 0, req.URL), nil
}

func newLocalAsset(userID int, groupID int64, name string, assetType string, mimeType string, size int64, url string) *model.Asset {
	now := common.GetTimestamp()
	return &model.Asset{
		UserID:          userID,
		AssetGroupID:    groupID,
		ProviderAssetID: "asset-" + common.GetTimeString() + "-" + common.GetRandomString(5),
		Name:            name,
		AssetType:       assetType,
		URL:             url,
		Status:          "Active",
		MimeType:        mimeType,
		Size:            size,
		CreatedTime:     now,
		UpdatedTime:     now,
	}
}

func assetTypeFromExtension(extension string) string {
	switch strings.ToLower(extension) {
	case ".jpg", ".jpeg", ".png", ".webp":
		return "Image"
	case ".mp4", ".mov":
		return "Video"
	case ".mp3", ".wav":
		return "Audio"
	default:
		return ""
	}
}

func parsePositiveInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}
