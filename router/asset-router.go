package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
)

func SetAssetRouter(router *gin.Engine) {
	assetRouter := router.Group("/api/assets")
	assetRouter.Use(middleware.UserAuth())
	{
		assetRouter.GET("/groups", controller.ListAssetGroups)
		assetRouter.POST("/groups", controller.CreateAssetGroup)
		assetRouter.GET("/config", controller.GetAssetConfig)
		assetRouter.GET("/groups/:group_id", controller.GetAssetGroupDetails)
		assetRouter.DELETE("/groups/:group_id", controller.DeleteAssetGroup)
		assetRouter.GET("/groups/:group_id/items", controller.ListAssets)
		assetRouter.POST("/groups/:group_id/items", controller.CreateAsset)
	}
}
