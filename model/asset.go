package model

import "gorm.io/gorm"

// AssetGroup 素材分组。
type AssetGroup struct {
	ID              int64          `json:"id" gorm:"primaryKey"`
	UserID          int            `json:"user_id" gorm:"index;uniqueIndex:idx_asset_group_user_provider"`
	ProviderGroupID string         `json:"provider_group_id" gorm:"uniqueIndex:idx_asset_group_user_provider"`
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	GroupType       string         `json:"group_type"`
	ProjectName     string         `json:"project_name"`
	CreatedTime     int64          `json:"created_time" gorm:"column:created_time;index"`
	UpdatedTime     int64          `json:"updated_time" gorm:"column:updated_time"`
	AssetCount      int            `json:"asset_count"`
	ProcessingCount int            `json:"processing_count"`
	FailedCount     int            `json:"failed_count"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
}

func (AssetGroup) TableName() string {
	return "asset_groups"
}

// Asset 素材资源。
type Asset struct {
	ID              int64          `json:"id" gorm:"primaryKey"`
	UserID          int            `json:"user_id" gorm:"index;uniqueIndex:idx_asset_user_provider"`
	AssetGroupID    int64          `json:"asset_group_id" gorm:"index"`
	ProviderAssetID string         `json:"provider_asset_id" gorm:"uniqueIndex:idx_asset_user_provider"`
	Name            string         `json:"name"`
	AssetType       string         `json:"asset_type" gorm:"index"`
	URL             string         `json:"url" gorm:"type:text"`
	Status          string         `json:"status" gorm:"index"`
	MimeType        string         `json:"mime_type"`
	Size            int64          `json:"size"`
	CreatedTime     int64          `json:"created_time" gorm:"column:created_time;index"`
	UpdatedTime     int64          `json:"updated_time" gorm:"column:updated_time"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`
}

func (Asset) TableName() string {
	return "assets"
}

type AssetGroupListParams struct {
	Page      int
	PageSize  int
	GroupType string
}

type AssetListParams struct {
	Page      int
	PageSize  int
	Query     string
	AssetType string
	Status    string
	Sort      string
}

func CreateAssetGroup(group *AssetGroup) error {
	return DB.Create(group).Error
}

// UpsertAssetGroup creates or updates an asset group by provider_group_id.
// Updates name and description if already exists.
func UpsertAssetGroup(group *AssetGroup) error {
	var existing AssetGroup
	err := DB.Where("user_id = ? AND provider_group_id = ?", group.UserID, group.ProviderGroupID).First(&existing).Error
	if err == nil {
		// Exists — update fields
		updates := map[string]interface{}{
			"name":        group.Name,
			"description": group.Description,
			"updated_time": group.UpdatedTime,
		}
		return DB.Model(&AssetGroup{}).Where("id = ?", existing.ID).Updates(updates).Error
	}
	if err == gorm.ErrRecordNotFound {
		return DB.Create(group).Error
	}
	return err
}

func UpdateAssetGroup(userID int, groupID int64, name, description string) error {
	updates := map[string]interface{}{
		"name":        name,
		"description": description,
	}
	return DB.Model(&AssetGroup{}).
		Where("user_id = ? AND id = ?", userID, groupID).
		Updates(updates).Error
}

// UpdateAssetGroupProviderID replaces a temporary local ID with the real ecloud groupId.
func UpdateAssetGroupProviderID(groupID int64, providerGroupID string) error {
	return DB.Model(&AssetGroup{}).
		Where("id = ?", groupID).
		Update("provider_group_id", providerGroupID).Error
}

func UpdateAssetGroupCounts(groupID int64) error {
	var total int64
	var processing int64
	var failed int64
	if err := DB.Model(&Asset{}).Where("asset_group_id = ?", groupID).Count(&total).Error; err != nil {
		return err
	}
	if err := DB.Model(&Asset{}).Where("asset_group_id = ? AND status = ?", groupID, "Processing").Count(&processing).Error; err != nil {
		return err
	}
	if err := DB.Model(&Asset{}).Where("asset_group_id = ? AND status = ?", groupID, "Failed").Count(&failed).Error; err != nil {
		return err
	}
	return DB.Model(&AssetGroup{}).Where("id = ?", groupID).Updates(map[string]interface{}{
		"asset_count":      total,
		"processing_count": processing,
		"failed_count":     failed,
	}).Error
}

func CreateAsset(asset *Asset) error {
	if err := DB.Create(asset).Error; err != nil {
		return err
	}
	return UpdateAssetGroupCounts(asset.AssetGroupID)
}

func DeleteAssetGroup(userID int, groupID int64) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND asset_group_id = ?", userID, groupID).Delete(&Asset{}).Error; err != nil {
			return err
		}
		return tx.Where("user_id = ? AND id = ?", userID, groupID).Delete(&AssetGroup{}).Error
	})
}

func ListAssetGroups(userID int, params AssetGroupListParams) ([]AssetGroup, int64, error) {
	var groups []AssetGroup
	var total int64

	query := DB.Model(&AssetGroup{}).Where("user_id = ?", userID)
	if params.GroupType != "" {
		query = query.Where("group_type = ?", params.GroupType)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.
		Order("created_time DESC").
		Offset((params.Page - 1) * params.PageSize).
		Limit(params.PageSize).
		Find(&groups).Error
	return groups, total, err
}

func GetAssetGroup(userID int, groupID int64) (*AssetGroup, error) {
	var group AssetGroup
	err := DB.Where("user_id = ? AND id = ?", userID, groupID).First(&group).Error
	return &group, err
}

func GetAssetByID(userID int, assetID int64) (*Asset, error) {
	var asset Asset
	err := DB.Where("user_id = ? AND id = ?", userID, assetID).First(&asset).Error
	return &asset, err
}

func UpdateAssetName(userID int, assetID int64, name string) error {
	return DB.Model(&Asset{}).
		Where("user_id = ? AND id = ?", userID, assetID).
		Updates(map[string]interface{}{
			"name": name,
		}).Error
}

func DeleteAsset(userID int, groupID, assetID int64) error {
	res := DB.Where("user_id = ? AND asset_group_id = ? AND id = ?", userID, groupID, assetID).Delete(&Asset{})
	if res.Error != nil {
		return res.Error
	}
	return UpdateAssetGroupCounts(groupID)
}

func ListAssets(userID int, groupID int64, params AssetListParams) ([]Asset, int64, error) {
	var assets []Asset
	var total int64

	query := DB.Model(&Asset{}).Where("user_id = ? AND asset_group_id = ?", userID, groupID)
	if params.Query != "" {
		query = query.Where("name LIKE ?", "%"+params.Query+"%")
	}
	if params.AssetType != "" {
		query = query.Where("asset_type = ?", params.AssetType)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	order := "created_time DESC"
	switch params.Sort {
	case "created_asc":
		order = "created_time ASC"
	case "name_asc":
		order = "name ASC"
	case "name_desc":
		order = "name DESC"
	}

	err := query.Order(order).
		Offset((params.Page - 1) * params.PageSize).
		Limit(params.PageSize).
		Find(&assets).Error
	return assets, total, err
}
