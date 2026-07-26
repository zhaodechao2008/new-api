package service

import "os"

// AssetConfig defines file constraints exposed by the local asset API.
type AssetConfig struct {
	Extensions      []string `json:"extensions"`
	LivenessEnabled bool     `json:"liveness_enabled"`
	MaxBatchFiles   int      `json:"max_batch_files"`
	MaxFileBytes    int64    `json:"max_file_bytes"`
}

// AssetService holds optional eCloud settings for future remote operations.
type AssetService struct {
	BaseURL string
	APIKey  string
}

func NewAssetService(baseURL, apiKey string) *AssetService {
	if baseURL == "" {
		baseURL = os.Getenv("ASSET_ECLOUD_URL")
	}
	if apiKey == "" {
		apiKey = os.Getenv("ASSET_ECLOUD_API_KEY")
	}
	return &AssetService{BaseURL: baseURL, APIKey: apiKey}
}

func GetAssetConfig() AssetConfig {
	return AssetConfig{
		Extensions: []string{
			".jpg",
			".jpeg",
			".png",
			".webp",
			".mp4",
			".mov",
			".mp3",
			".wav",
		},
		LivenessEnabled: true,
		MaxBatchFiles:   20,
		MaxFileBytes:    200 * 1024 * 1024,
	}
}
