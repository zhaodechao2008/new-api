package controller

import (
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

// ecloudSvc returns a configured AssetService reading from env by default.
func ecloudSvc() *service.AssetService {
	return service.NewAssetService("", "")
}

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

// CreateAssetGroup creates a local group record. The ecloud group is created
// lazily when the first asset is uploaded (since ecloud has no empty-group API).
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
	// Use "local-" prefix to indicate group is not yet synced to ecloud.
	group := &model.AssetGroup{
		UserID:          c.GetInt("id"),
		ProviderGroupID: "local-" + common.GetTimeString() + "-" + common.GetRandomString(5),
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

func UpdateAssetGroup(c *gin.Context) {
	groupID, err := strconv.ParseInt(c.Param("group_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid group_id"})
		return
	}
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	userID := c.GetInt("id")
	if err := model.UpdateAssetGroup(userID, groupID, strings.TrimSpace(req.Name), strings.TrimSpace(req.Description)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	group, err := model.GetAssetGroup(userID, groupID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": group})
}

// DeleteAssetGroup deletes the group from ecloud (if synced) then from local DB.
func DeleteAssetGroup(c *gin.Context) {
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

	// Delete from ecloud if already synced (real ecloud IDs start with "group-")
	if strings.HasPrefix(group.ProviderGroupID, "group-") {
		svc := ecloudSvc()
		if svcErr := svc.DeleteGroup(group.ProviderGroupID); svcErr != nil {
			// Log but don't fail; allow local cleanup to proceed.
			common.SysError(fmt.Sprintf("ecloud DeleteGroup %s: %v", group.ProviderGroupID, svcErr))
		}
	}

	if err := model.DeleteAssetGroup(userID, groupID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func UpdateAsset(c *gin.Context) {
	groupID, err := strconv.ParseInt(c.Param("group_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid group_id"})
		return
	}
	assetID, err := strconv.ParseInt(c.Param("asset_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid asset_id"})
		return
	}
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "name is required"})
		return
	}

	userID := c.GetInt("id")

	// Sync rename to ecloud (best-effort: non-fatal on failure).
	asset, assetErr := model.GetAssetByID(userID, assetID)
	if assetErr == nil && asset.ProviderAssetID != "" {
		group, groupErr := model.GetAssetGroup(userID, groupID)
		if groupErr == nil && strings.HasPrefix(group.ProviderGroupID, "group-") {
			svc := ecloudSvc()
			if svcErr := svc.RenameAsset(group.ProviderGroupID, asset.ProviderAssetID, name); svcErr != nil {
				common.SysError(fmt.Sprintf("ecloud RenameAsset %s/%s: %v", group.ProviderGroupID, asset.ProviderAssetID, svcErr))
			}
		}
	}

	if err := model.UpdateAssetName(userID, assetID, name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteAsset(c *gin.Context) {
	groupID, err := strconv.ParseInt(c.Param("group_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid group_id"})
		return
	}
	assetID, err := strconv.ParseInt(c.Param("asset_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid asset_id"})
		return
	}
	userID := c.GetInt("id")

	// Sync delete to ecloud before removing locally.
	asset, assetErr := model.GetAssetByID(userID, assetID)
	if assetErr == nil && asset.ProviderAssetID != "" {
		group, groupErr := model.GetAssetGroup(userID, groupID)
		if groupErr == nil && strings.HasPrefix(group.ProviderGroupID, "group-") {
			svc := ecloudSvc()
			if svcErr := svc.DeleteAsset(group.ProviderGroupID, asset.ProviderAssetID); svcErr != nil {
				common.SysError(fmt.Sprintf("ecloud DeleteAsset %s/%s: %v", group.ProviderGroupID, asset.ProviderAssetID, svcErr))
			}
		}
	}

	if err := model.DeleteAsset(userID, groupID, assetID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// CreateAsset handles both multipart file upload and JSON URL import.
func CreateAsset(c *gin.Context) {
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

	var asset *model.Asset
	if strings.HasPrefix(c.GetHeader("Content-Type"), "multipart/form-data") {
		asset, err = createUploadedAsset(c, userID, group)
	} else {
		asset, err = createURLAsset(c, userID, group)
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

func createUploadedAsset(c *gin.Context, userID int, group *model.AssetGroup) (*model.Asset, error) {
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
	// Store a clean name without the extension.
	storedName := strings.TrimSuffix(file.Filename, filepath.Ext(file.Filename))

	svc := ecloudSvc()

	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	var ecloudAssetID, ecloudAssetURL string
	var ecloudGroupID = group.ProviderGroupID

	if strings.HasPrefix(group.ProviderGroupID, "local-") {
		// First upload for this group: create a new ecloud group.
		detail, uploadErr := svc.UploadToNewGroup(group.Name, []io.Reader{src}, []string{file.Filename})
		if uploadErr != nil {
			return nil, fmt.Errorf("ecloud upload failed: %w", uploadErr)
		}
		ecloudGroupID = detail.Group.GroupID
		// Update local group's provider ID with the real ecloud group ID.
		_ = model.UpdateAssetGroupProviderID(group.ID, ecloudGroupID)
		if len(detail.Assets) > 0 {
			ecloudAssetID = detail.Assets[0].AssetID
			ecloudAssetURL = detail.Assets[0].AssetURL
		}
	} else {
		// Append to existing ecloud group.
		assets, uploadErr := svc.AppendToGroup(group.ProviderGroupID, []io.Reader{src}, []string{file.Filename})
		if uploadErr != nil {
			return nil, fmt.Errorf("ecloud upload failed: %w", uploadErr)
		}
		if len(assets) > 0 {
			ecloudAssetID = assets[0].AssetID
			ecloudAssetURL = assets[0].AssetURL
		}
	}

	_ = ecloudGroupID // used above
	now := common.GetTimestamp()
	return &model.Asset{
		UserID:          userID,
		AssetGroupID:    group.ID,
		ProviderAssetID: ecloudAssetID,
		Name:            storedName,
		AssetType:       assetType,
		URL:             ecloudAssetURL,
		Status:          "Active",
		MimeType:        file.Header.Get("Content-Type"),
		Size:            file.Size,
		CreatedTime:     now,
		UpdatedTime:     now,
	}, nil
}

func createURLAsset(c *gin.Context, userID int, group *model.AssetGroup) (*model.Asset, error) {
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

	svc := ecloudSvc()
	detail, err := svc.ImportURL(req.URL, req.AssetType, name)
	if err != nil {
		return nil, fmt.Errorf("ecloud import failed: %w", err)
	}

	// If the local group is not yet synced, update it with the ecloud group ID.
	if strings.HasPrefix(group.ProviderGroupID, "local-") && detail.Group.GroupID != "" {
		_ = model.UpdateAssetGroupProviderID(group.ID, detail.Group.GroupID)
	}

	var ecloudAssetID, ecloudAssetURL string
	if len(detail.Assets) > 0 {
		ecloudAssetID = detail.Assets[0].AssetID
		ecloudAssetURL = detail.Assets[0].AssetURL
	}

	now := common.GetTimestamp()
	return &model.Asset{
		UserID:          userID,
		AssetGroupID:    group.ID,
		ProviderAssetID: ecloudAssetID,
		Name:            name,
		AssetType:       req.AssetType,
		URL:             ecloudAssetURL,
		Status:          "Active",
		MimeType:        req.MimeType,
		Size:            0,
		CreatedTime:     now,
		UpdatedTime:     now,
	}, nil
}

// ImportURLAsset handles POST /api/assets/groups/:group_id/upload-url.
// Body: {"url":"...","name":"...","asset_type":"Image|Video|Audio"}
// Calls ecloud /api/video-studio/assets/ecloud/import-url and saves locally.
func ImportURLAsset(c *gin.Context) {
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
	asset, err := createURLAsset(c, userID, group)
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

// CreateLivenessSession handles POST /api/assets/liveness/sessions.
// Calls ecloud /api/video-studio/assets/ecloud/liveness/sessions.
func CreateLivenessSession(c *gin.Context) {
	svc := ecloudSvc()
	session, err := svc.CreateLivenessSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"bytedToken": session.ByteDanceToken,
			"expiresAt":  session.ExpiresAt,
			"expiresIn": session.ExpiresIn,
			"h5Link":   session.H5Link,
			"qrDataUrl": session.QrDataUrl,
		},
	})
}

// SyncLivenessGroups handles POST /api/assets/liveness/groups/sync.
// Calls ecloud liveness/groups/sync which returns ALL liveness groups for the account,
// then upserts each one locally. Identifies newly created groups by diffing against the
// pre-sync local set, so the caller can tell which group the bytedToken session created.
// Body: {"bytedToken":"..."} — the token from CreateLivenessSession.
func SyncLivenessGroups(c *gin.Context) {
	userID := c.GetInt("id")

	var req struct {
		BytedToken string `json:"bytedToken"`
	}
	_ = c.ShouldBindJSON(&req)

	// Snapshot the provider_group_ids already known locally before calling ecloud,
	// so we can identify which groups are brand-new after the sync.
	existingIDs, err := model.GetLivenessGroupProviderIDs(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	svc := ecloudSvc()
	result, err := svc.SyncLivenessGroups(req.BytedToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	now := common.GetTimestamp()
	var synced []*model.AssetGroup
	var newGroups []*model.AssetGroup

	for _, eg := range result.Groups {
		if eg.GroupID == "" {
			continue
		}
		isNew := false
		if _, known := existingIDs[eg.GroupID]; !known {
			isNew = true
		}
		group := &model.AssetGroup{
			UserID:          userID,
			ProviderGroupID: eg.GroupID,
			Name:            eg.DisplayName,
			Description:     "",
			GroupType:       "LivenessFace",
			ProjectName:     "default",
			CreatedTime:     now,
			UpdatedTime:     now,
		}
		if upsertErr := model.UpsertAssetGroup(group); upsertErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": upsertErr.Error()})
			return
		}
		synced = append(synced, group)
		if isNew {
			newGroups = append(newGroups, group)
		}
	}

	if synced == nil {
		synced = []*model.AssetGroup{}
	}
	if newGroups == nil {
		newGroups = []*model.AssetGroup{}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"groups":     synced,
		"new_groups": newGroups,
		"total":      len(synced),
	}})
}

// RefreshGroupStatus handles POST /api/assets/groups/:group_id/refresh.
// Calls ecloud GET /{providerGroupId} to fetch the latest asset statuses and
// signed URLs, then writes any changes back to the local database.
func RefreshGroupStatus(c *gin.Context) {
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
	if group.ProviderGroupID == "" || strings.HasPrefix(group.ProviderGroupID, "local-") {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"synced": 0}})
		return
	}

	svc := ecloudSvc()
	detail, err := svc.GetGroup(group.ProviderGroupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	var synced int
	for _, ea := range detail.Assets {
		if ea.AssetID == "" {
			continue
		}
		status := normalizeEcloudStatus(ea.Status)
		if updateErr := model.UpdateAssetStatusAndURL(ea.AssetID, status, ea.AssetURL); updateErr == nil {
			synced++
		}
	}

	// Refresh denormalized counts on the group after status updates.
	_ = model.UpdateAssetGroupCounts(groupID)

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"synced": synced}})
}

// normalizeEcloudStatus converts ecloud's all-caps status values (e.g. "ACTIVE",
// "PROCESSING", "FAILED") to the title-case form stored locally.
func normalizeEcloudStatus(s string) string {
	switch strings.ToUpper(s) {
	case "ACTIVE":
		return "Active"
	case "PROCESSING":
		return "Processing"
	case "FAILED":
		return "Failed"
	default:
		return "Active"
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
