package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
)

func SetAssetRouter(router *gin.Engine) {
	assetRouter := router.Group("/api/assets")
	assetRouter.Use(middleware.UserOrApiTokenAuth())
	{
		assetRouter.GET("/groups", controller.ListAssetGroups)
		assetRouter.POST("/groups", controller.CreateAssetGroup)
		assetRouter.GET("/config", controller.GetAssetConfig)
		assetRouter.POST("/liveness/sessions", controller.CreateLivenessSession)
		assetRouter.POST("/liveness/groups/sync", controller.SyncLivenessGroups)
		assetRouter.GET("/groups/:group_id", controller.GetAssetGroupDetails)
		assetRouter.PATCH("/groups/:group_id", controller.UpdateAssetGroup)
		assetRouter.DELETE("/groups/:group_id", controller.DeleteAssetGroup)
		assetRouter.GET("/groups/:group_id/items", controller.ListAssets)
		assetRouter.POST("/groups/:group_id/upload", controller.CreateAsset)
		assetRouter.POST("/groups/:group_id/upload-url", controller.ImportURLAsset)
		assetRouter.POST("/groups/:group_id/refresh", controller.RefreshGroupStatus)
		assetRouter.PATCH("/groups/:group_id/items/:asset_id", controller.UpdateAsset)
		assetRouter.DELETE("/groups/:group_id/items/:asset_id", controller.DeleteAsset)
	}
}
