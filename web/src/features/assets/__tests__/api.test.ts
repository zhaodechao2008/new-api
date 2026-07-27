/*
	Copyright (C) 2023-2026 QuantumNous

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as
	published by the Free Software Foundation, either version 3 of the
	License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program. If not, see <https://www.gnu.org/licenses/>.

	For commercial licensing, please contact support@quantumnous.com
*/
import assert from 'node:assert/strict'
import { afterEach, describe, test } from 'node:test'

import type { AxiosAdapter, AxiosResponse } from 'axios'

import { api } from '@/lib/api'

import {
  createAssetByUrl,
  createAssetGroup,
  deleteAssetGroup,
  getAssetConfig,
  getAssetGroupDetails,
  getAssetGroups,
  listAssets,
  uploadAsset,
} from '../api'
import type { Asset, AssetConfig, AssetGroup } from '../types'

const originalAdapter = api.defaults.adapter

function response(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as AxiosResponse['config'],
  }
}

afterEach(() => {
  api.defaults.adapter = originalAdapter
})

const group = {
  id: 82,
  user_id: 21,
  provider_group_id: 'group-demo',
  name: 'Demo',
  description: '',
  group_type: 'AIGC',
  project_name: 'default',
  created_time: 1785078567,
  updated_time: 1785078567,
  asset_count: 1,
  processing_count: 0,
  failed_count: 0,
} satisfies AssetGroup

const asset = {
  id: 77,
  user_id: 21,
  asset_group_id: 82,
  provider_asset_id: 'asset-demo',
  name: 'image.png',
  asset_type: 'Image',
  url: 'https://example.com/image.png',
  status: 'Active',
  mime_type: 'image/png',
  size: 1024,
  created_time: 1785079194,
  updated_time: 1785079214,
} satisfies Asset

const config = {
  extensions: ['.jpg', '.png'],
  liveness_enabled: true,
  max_batch_files: 20,
  max_file_bytes: 209715200,
} satisfies AssetConfig

describe('asset API response contracts', () => {
  test('unwraps paged groups, config, and group details', async () => {
    api.defaults.adapter = (async (request) => {
      if (request.url === '/api/assets/groups') {
        return response({
          success: true,
          data: { items: [group], page: 1, page_size: 20, total: 1 },
        })
      }
      if (request.url === '/api/assets/config') {
        return response({ success: true, data: config })
      }
      return response({
        success: true,
        data: { group, assets: [asset] },
      })
    }) satisfies AxiosAdapter

    assert.deepEqual((await getAssetGroups()).items, [group])
    assert.deepEqual((await getAssetGroups('AIGC')).items, [group])
    assert.deepEqual(await getAssetConfig(), config)
    assert.deepEqual(await getAssetGroupDetails(82), {
      group,
      assets: [asset],
    })
  })

  test('forwards group_type filter when listing groups', async () => {
    let capturedParams: Record<string, string> | undefined
    api.defaults.adapter = (async (request) => {
      capturedParams = request.params as Record<string, string> | undefined
      return response({
        success: true,
        data: { items: [], page: 1, page_size: 20, total: 0 },
      })
    }) satisfies AxiosAdapter

    await getAssetGroups('LivenessFace')
    assert.equal(capturedParams?.group_type, 'LivenessFace')
  })

  test('forwards pagination and filters when listing assets', async () => {
    let requestURL = ''
    api.defaults.adapter = (async (request) => {
      requestURL = request.url ?? ''
      return response({
        success: true,
        data: { items: [asset], page: 2, page_size: 12, total: 13 },
      })
    }) satisfies AxiosAdapter

    const result = await listAssets(82, {
      p: 2,
      page_size: 12,
      q: 'image',
      asset_type: 'Image',
      status: 'Active',
      sort: 'created_desc',
    })

    const request = new URL(requestURL, 'http://localhost')
    assert.equal(request.pathname, '/api/assets/groups/82/items')
    assert.equal(request.searchParams.get('p'), '2')
    assert.equal(request.searchParams.get('page_size'), '12')
    assert.equal(request.searchParams.get('q'), 'image')
    assert.equal(request.searchParams.get('asset_type'), 'Image')
    assert.equal(request.searchParams.get('status'), 'Active')
    assert.equal(request.searchParams.get('sort'), 'created_desc')
    assert.deepEqual(result.items, [asset])
  })

  test('creates an asset group via POST', async () => {
    let capturedMethod = ''
    let capturedURL = ''
    let capturedBody: unknown = null
    api.defaults.adapter = (async (request) => {
      capturedMethod = request.method ?? 'GET'
      capturedURL = request.url ?? ''
      capturedBody = JSON.parse(request.data as string)
      return response({ success: true, data: group })
    }) satisfies AxiosAdapter

    const result = await createAssetGroup({
      name: 'Demo',
      group_type: 'AIGC',
    })

    assert.equal(capturedMethod, 'post')
    assert.equal(capturedURL, '/api/assets/groups')
    assert.deepEqual(capturedBody, { name: 'Demo', group_type: 'AIGC' })
    assert.deepEqual(result, group)
  })

  test('deletes an asset group via DELETE', async () => {
    let capturedMethod = ''
    let capturedURL = ''
    api.defaults.adapter = (async (request) => {
      capturedMethod = request.method ?? 'GET'
      capturedURL = request.url ?? ''
      return response({ success: true })
    }) satisfies AxiosAdapter

    await deleteAssetGroup(82)

    assert.equal(capturedMethod, 'delete')
    assert.equal(capturedURL, '/api/assets/groups/82')
  })

  test('uploads an asset via multipart form data', async () => {
    let capturedMethod = ''
    let capturedURL = ''
    let capturedContentType = ''
    api.defaults.adapter = (async (request) => {
      capturedMethod = request.method ?? 'GET'
      capturedURL = request.url ?? ''
      capturedContentType =
        (request.headers?.['Content-Type'] as string) ?? ''
      return response({ success: true, data: asset })
    }) satisfies AxiosAdapter

    const file = new File(['fake-image'], 'image.png', {
      type: 'image/png',
    })
    const result = await uploadAsset(82, file)

    assert.equal(capturedMethod, 'post')
    assert.equal(capturedURL, '/api/assets/groups/82/items')
    assert.ok(capturedContentType.includes('multipart/form-data'))
    assert.deepEqual(result, asset)
  })

  test('creates an asset by URL via JSON body', async () => {
    let capturedMethod = ''
    let capturedURL = ''
    let capturedBody: unknown = null
    api.defaults.adapter = (async (request) => {
      capturedMethod = request.method ?? 'GET'
      capturedURL = request.url ?? ''
      capturedBody = JSON.parse(request.data as string)
      return response({ success: true, data: asset })
    }) satisfies AxiosAdapter

    const result = await createAssetByUrl(82, {
      url: 'https://example.com/image.png',
    })

    assert.equal(capturedMethod, 'post')
    assert.equal(capturedURL, '/api/assets/groups/82/items')
    assert.deepEqual(capturedBody, { url: 'https://example.com/image.png' })
    assert.deepEqual(result, asset)
  })
})
