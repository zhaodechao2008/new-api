package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

// ECloud API DTOs
type ECloudAsset struct {
	AssetID     string `json:"assetId"`
	AssetName   string `json:"assetName"`
	FileName    string `json:"fileName"`
	AssetType   string `json:"assetType"`
	AssetURL    string `json:"assetUrl"`
	Status      string `json:"status"`
	CreatedTime string `json:"createdTime"`
}

type ECloudGroup struct {
	GroupID           string `json:"groupId"`
	GroupName         string `json:"groupName"`
	DisplayName       string `json:"displayName"`
	GroupType         string `json:"groupType"`
	OriginalGroupName string `json:"originalGroupName"`
	CoverURL          string `json:"coverUrl"`
	CreatedTime       int64  `json:"createdTime"`
}

type ECloudGroupDetail struct {
	Group     ECloudGroup   `json:"group"`
	Assets    []ECloudAsset `json:"assets"`
	TotalSize int           `json:"totalSize"`
}

type ECloudListResponse struct {
	GroupIDs  []string `json:"groupIds"`
	TotalSize int      `json:"totalSize"`
}

type ECloudResponse struct {
	Data      json.RawMessage `json:"data"`
	Error     interface{}     `json:"error"`
	RequestID string          `json:"request_id"`
}

// UploadToNewGroup uploads files to ecloud and creates a new group
func (s *AssetService) UploadToNewGroup(displayName string, files []io.Reader, fileNames []string) (*ECloudGroupDetail, error) {
	if s.BaseURL == "" || s.APIKey == "" {
		return nil, fmt.Errorf("ecloud not configured")
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add displayName field
	if err := writer.WriteField("displayName", displayName); err != nil {
		return nil, err
	}

	// Add files
	for i, file := range files {
		part, err := writer.CreateFormFile("files", fileNames[i])
		if err != nil {
			return nil, err
		}
		if _, err := io.Copy(part, file); err != nil {
			return nil, err
		}
	}
	writer.Close()

	req, err := http.NewRequest("POST", s.BaseURL+"/api/video-studio/assets/ecloud/upload-and-save", body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ecloud upload failed: %d %s", resp.StatusCode, string(bodyBytes))
	}

	var ecloudResp ECloudResponse
	if err := json.NewDecoder(resp.Body).Decode(&ecloudResp); err != nil {
		return nil, err
	}

	var detail ECloudGroupDetail
	if err := json.Unmarshal(ecloudResp.Data, &detail); err != nil {
		return nil, err
	}

	return &detail, nil
}

// AppendToGroup uploads files to an existing ecloud group
func (s *AssetService) AppendToGroup(groupID string, files []io.Reader, fileNames []string) ([]ECloudAsset, error) {
	if s.BaseURL == "" || s.APIKey == "" {
		return nil, fmt.Errorf("ecloud not configured")
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	for i, file := range files {
		part, err := writer.CreateFormFile("files", fileNames[i])
		if err != nil {
			return nil, err
		}
		if _, err := io.Copy(part, file); err != nil {
			return nil, err
		}
	}
	writer.Close()

	url := fmt.Sprintf("%s/api/video-studio/assets/ecloud/%s/upload-and-save", s.BaseURL, groupID)
	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ecloud append failed: %d %s", resp.StatusCode, string(bodyBytes))
	}

	var ecloudResp ECloudResponse
	if err := json.NewDecoder(resp.Body).Decode(&ecloudResp); err != nil {
		return nil, err
	}

	var detail ECloudGroupDetail
	if err := json.Unmarshal(ecloudResp.Data, &detail); err != nil {
		return nil, err
	}

	return detail.Assets, nil
}

// ImportURL imports a public URL to ecloud
func (s *AssetService) ImportURL(assetURL, assetType, displayName string) (*ECloudGroupDetail, error) {
	if s.BaseURL == "" || s.APIKey == "" {
		return nil, fmt.Errorf("ecloud not configured")
	}

	reqBody := map[string]interface{}{
		"assetUrl":    assetURL,
		"assetType":   assetType,
		"displayName": displayName,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", s.BaseURL+"/api/video-studio/assets/ecloud/import-url", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ecloud import failed: %d %s", resp.StatusCode, string(bodyBytes))
	}

	var ecloudResp ECloudResponse
	if err := json.NewDecoder(resp.Body).Decode(&ecloudResp); err != nil {
		return nil, err
	}

	var detail ECloudGroupDetail
	if err := json.Unmarshal(ecloudResp.Data, &detail); err != nil {
		return nil, err
	}

	return &detail, nil
}

// LivenessSession represents the response from the liveness session API.
type LivenessSession struct {
	ByteDanceToken string `json:"bytedToken"`
	ExpiresAt     string `json:"expiresAt"`
	ExpiresIn     int    `json:"expiresIn"`
	H5Link        string `json:"h5Link"`
	QrDataUrl     string `json:"qrDataUrl"`
}

// CreateLivenessSession creates a liveness authorization session via ecloud.
func (s *AssetService) CreateLivenessSession() (*LivenessSession, error) {
	if s.BaseURL == "" || s.APIKey == "" {
		return nil, fmt.Errorf("ecloud not configured")
	}

	req, err := http.NewRequest("POST", s.BaseURL+"/api/video-studio/assets/ecloud/liveness/sessions", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ecloud liveness session failed: %d %s", resp.StatusCode, string(bodyBytes))
	}

	var ecloudResp ECloudResponse
	if err := json.NewDecoder(resp.Body).Decode(&ecloudResp); err != nil {
		return nil, err
	}

	var session LivenessSession
	if err := json.Unmarshal(ecloudResp.Data, &session); err != nil {
		return nil, err
	}

	return &session, nil
}

// SyncLivenessGroups syncs liveness groups from ecloud and returns the synced group.
func (s *AssetService) SyncLivenessGroups() (*ECloudGroup, error) {
	if s.BaseURL == "" || s.APIKey == "" {
		return nil, fmt.Errorf("ecloud not configured")
	}

	req, err := http.NewRequest("POST", s.BaseURL+"/api/video-studio/assets/ecloud/liveness/groups/sync", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ecloud liveness sync failed: %d %s", resp.StatusCode, string(bodyBytes))
	}

	var ecloudResp ECloudResponse
	if err := json.NewDecoder(resp.Body).Decode(&ecloudResp); err != nil {
		return nil, err
	}

	var group ECloudGroup
	if err := json.Unmarshal(ecloudResp.Data, &group); err != nil {
		return nil, err
	}
	return &group, nil
}

// GetGroup fetches group details from ecloud
func (s *AssetService) GetGroup(groupID string) (*ECloudGroupDetail, error) {
	if s.BaseURL == "" || s.APIKey == "" {
		return nil, fmt.Errorf("ecloud not configured")
	}

	url := fmt.Sprintf("%s/api/video-studio/assets/ecloud/%s", s.BaseURL, groupID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ecloud get group failed: %d %s", resp.StatusCode, string(bodyBytes))
	}

	var ecloudResp ECloudResponse
	if err := json.NewDecoder(resp.Body).Decode(&ecloudResp); err != nil {
		return nil, err
	}

	var detail ECloudGroupDetail
	if err := json.Unmarshal(ecloudResp.Data, &detail); err != nil {
		return nil, err
	}

	return &detail, nil
}

// DeleteAsset deletes a single asset from ecloud.
func (s *AssetService) DeleteAsset(groupID, assetID string) error {
	if s.BaseURL == "" || s.APIKey == "" {
		return fmt.Errorf("ecloud not configured")
	}

	url := fmt.Sprintf("%s/api/video-studio/assets/ecloud/%s/assets/%s", s.BaseURL, groupID, assetID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ecloud delete asset failed: %d %s", resp.StatusCode, string(bodyBytes))
	}
	return nil
}

// RenameAsset renames a single asset in ecloud. Best-effort: the endpoint may
// not be available on all deployments; callers should log but not surface the error.
func (s *AssetService) RenameAsset(groupID, assetID, displayName string) error {
	if s.BaseURL == "" || s.APIKey == "" {
		return fmt.Errorf("ecloud not configured")
	}

	reqBody, _ := json.Marshal(map[string]string{"displayName": displayName})
	url := fmt.Sprintf("%s/api/video-studio/assets/ecloud/%s/assets/%s", s.BaseURL, groupID, assetID)
	req, err := http.NewRequest("PATCH", url, bytes.NewReader(reqBody))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ecloud rename asset failed: %d %s", resp.StatusCode, string(bodyBytes))
	}
	return nil
}

// DeleteGroup deletes a group from ecloud
func (s *AssetService) DeleteGroup(groupID string) error {
	if s.BaseURL == "" || s.APIKey == "" {
		return fmt.Errorf("ecloud not configured")
	}

	url := fmt.Sprintf("%s/api/video-studio/assets/ecloud/%s", s.BaseURL, groupID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ecloud delete failed: %d %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
