const NOTION_VERSION = '2022-06-28'

function normalizedEnv(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : fallback
}

const RECIPE_KEY_PROPERTY = normalizedEnv('NOTION_RECIPE_KEY_PROPERTY', 'LifeOS Key')
const FIELD_ENV_OVERRIDES = {
  title: process.env.NOTION_RECIPE_TITLE_PROPERTY,
  tag: process.env.NOTION_RECIPE_TYPE_PROPERTY,
  carbSignal: process.env.NOTION_RECIPE_CARB_SIGNAL_PROPERTY,
  base: process.env.NOTION_RECIPE_BASE_PROPERTY,
  protein: process.env.NOTION_RECIPE_PROTEIN_PROPERTY,
  vehicle: process.env.NOTION_RECIPE_VEHICLE_PROPERTY,
  source: process.env.NOTION_RECIPE_SOURCE_PROPERTY,
  recipeKey: process.env.NOTION_RECIPE_KEY_PROPERTY,
}
const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://misimisys.github.io',
  'https://jideatom.github.io',
]

const databaseSchemaCache = new Map()

const FIELD_ALIASES = {
  title: ['Name', 'Title', 'Recipe', 'Recipe Name'],
  tag: ['Type', 'Tag', 'Category'],
  carbSignal: ['Carb Signal', 'Carb', 'Carb Level'],
  base: ['Base', 'Dish', 'Meal Base'],
  protein: ['Protein', 'Protein Anchor'],
  vehicle: ['Vehicle / Note', 'Vehicle', 'Notes', 'Note'],
  source: ['Source', 'Origin'],
  recipeKey: [RECIPE_KEY_PROPERTY, 'LifeOS Key', 'Recipe Key'],
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

function allowedOrigins() {
  const configured = process.env.LIFEOS_ALLOWED_ORIGIN
  if (!configured) return DEFAULT_ALLOWED_ORIGINS

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function setCors(request, response) {
  const requestOrigin = request.headers.origin
  const allowed = allowedOrigins()
  const responseOrigin =
    requestOrigin && allowed.includes(requestOrigin)
      ? requestOrigin
      : allowed[0] || '*'

  response.setHeader('Access-Control-Allow-Origin', responseOrigin)
  response.setHeader('Vary', 'Origin')
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function parseBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  if (typeof request.body === 'string') return JSON.parse(request.body)
  return {}
}

function normalizeValue(value) {
  return String(value ?? '')
    .trim()
    .slice(0, 2000)
}

function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function splitMultiValue(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeValue(entry))
      .filter(Boolean)
      .slice(0, 25)
  }

  return normalizeValue(value)
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 25)
}

function titleProperty(value) {
  return {
    title: normalizeValue(value)
      ? [
          {
            text: {
              content: normalizeValue(value),
            },
          },
        ]
      : [],
  }
}

function richTextProperty(value) {
  return {
    rich_text: normalizeValue(value)
      ? [
          {
            text: {
              content: normalizeValue(value),
            },
          },
        ]
      : [],
  }
}

function findSchemaProperty(schema, aliases, type) {
  const entries = Object.entries(schema)
  const filteredAliases = aliases.filter(Boolean)
  const overrideExact = filteredAliases.find((alias) => schema[alias] && (!type || schema[alias]?.type === type))
  if (overrideExact) return [overrideExact, schema[overrideExact]]

  const aliasKeys = filteredAliases.map(normalizeKey)
  const byAlias = entries.find(([name, property]) => aliases.includes(name) && (!type || property?.type === type))
  if (byAlias) return byAlias

  const byCaseInsensitiveAlias = entries.find(
    ([name, property]) => aliasKeys.includes(normalizeKey(name)) && (!type || property?.type === type),
  )
  if (byCaseInsensitiveAlias) return byCaseInsensitiveAlias

  if (type) {
    return entries.find(([, property]) => property?.type === type) || null
  }

  return null
}

function resolveRecipeSchema(schema) {
  const titleEntry = findSchemaProperty(schema, FIELD_ALIASES.title, 'title')
  if (!titleEntry) {
    throw new Error('Could not find a title property in the Notion recipes database.')
  }

  const [titlePropertyName] = titleEntry
  const mapping = {
    title: titlePropertyName,
    tag: findSchemaProperty(schema, [FIELD_ENV_OVERRIDES.tag, ...FIELD_ALIASES.tag])?.[0] ?? null,
    carbSignal: findSchemaProperty(schema, [FIELD_ENV_OVERRIDES.carbSignal, ...FIELD_ALIASES.carbSignal])?.[0] ?? null,
    base: findSchemaProperty(schema, [FIELD_ENV_OVERRIDES.base, ...FIELD_ALIASES.base])?.[0] ?? null,
    protein: findSchemaProperty(schema, [FIELD_ENV_OVERRIDES.protein, ...FIELD_ALIASES.protein])?.[0] ?? null,
    vehicle: findSchemaProperty(schema, [FIELD_ENV_OVERRIDES.vehicle, ...FIELD_ALIASES.vehicle])?.[0] ?? null,
    source: findSchemaProperty(schema, [FIELD_ENV_OVERRIDES.source, ...FIELD_ALIASES.source])?.[0] ?? null,
    recipeKey: findSchemaProperty(schema, [FIELD_ENV_OVERRIDES.recipeKey, ...FIELD_ALIASES.recipeKey])?.[0] ?? null,
  }

  return mapping
}

function notionPropertyValue(property, rawValue) {
  const value = normalizeValue(rawValue)

  switch (property?.type) {
    case 'title':
      return titleProperty(value)
    case 'rich_text':
      return richTextProperty(value)
    case 'select':
      return { select: value ? { name: value.slice(0, 100) } : null }
    case 'multi_select':
      return {
        multi_select: splitMultiValue(rawValue).map((entry) => ({
          name: entry.slice(0, 100),
        })),
      }
    case 'url':
      return { url: value || null }
    case 'email':
      return { email: value || null }
    case 'phone_number':
      return { phone_number: value || null }
    case 'number': {
      const numberValue = Number(rawValue)
      return { number: Number.isFinite(numberValue) ? numberValue : null }
    }
    case 'checkbox':
      return { checkbox: Boolean(rawValue) }
    case 'status':
      return { status: value ? { name: value.slice(0, 100) } : null }
    case 'date':
      return { date: value ? { start: value } : null }
    default:
      return richTextProperty(value)
  }
}

function buildRecipeProperties(recipe, schema, mapping) {
  const rawValues = {
    [mapping.title]: recipe.title,
    [mapping.tag]: recipe.tag,
    [mapping.carbSignal]: recipe.carbSignal,
    [mapping.base]: recipe.base,
    [mapping.protein]: recipe.protein,
    [mapping.vehicle]: recipe.vehicle,
    [mapping.source]: recipe.source,
    [mapping.recipeKey]: recipe.id,
  }

  return Object.entries(rawValues).reduce((accumulator, [propertyName, rawValue]) => {
    if (!propertyName || !schema[propertyName]) return accumulator

    accumulator[propertyName] = notionPropertyValue(schema[propertyName], rawValue)
    return accumulator
  }, {})
}

function buildFilter(propertyName, property, value) {
  const normalized = normalizeValue(value)
  if (!propertyName || !property || !normalized) return null

  switch (property.type) {
    case 'title':
      return {
        property: propertyName,
        title: {
          equals: normalized,
        },
      }
    case 'rich_text':
      return {
        property: propertyName,
        rich_text: {
          equals: normalized,
        },
      }
    case 'select':
      return {
        property: propertyName,
        select: {
          equals: normalized,
        },
      }
    case 'status':
      return {
        property: propertyName,
        status: {
          equals: normalized,
        },
      }
    case 'url':
      return {
        property: propertyName,
        url: {
          equals: normalized,
        },
      }
    default:
      return null
  }
}

async function notionRequest(path, init = {}) {
  const notionToken = normalizedEnv('NOTION_TOKEN')
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
      ...init.headers,
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || `Notion request failed: ${response.status}`)
  }

  return payload
}

async function getDatabaseSchema(databaseId) {
  if (databaseSchemaCache.has(databaseId)) {
    return databaseSchemaCache.get(databaseId)
  }

  const payload = await notionRequest(`/databases/${databaseId}`)
  const schema = payload.properties || {}
  const resolved = {
    schema,
    mapping: resolveRecipeSchema(schema),
  }
  databaseSchemaCache.set(databaseId, resolved)
  return resolved
}

async function findRecipePage(databaseId, recipe, resolvedSchema) {
  const { schema, mapping } = resolvedSchema
  const keyFilter =
    mapping.recipeKey && schema[mapping.recipeKey]
      ? buildFilter(mapping.recipeKey, schema[mapping.recipeKey], recipe.id)
      : null
  const titleFilter = buildFilter(mapping.title, schema[mapping.title], recipe.title)
  const filter = keyFilter || titleFilter

  if (!filter) return null

  const payload = await notionRequest(`/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter,
      page_size: 1,
    }),
  })

  return payload.results?.[0] || null
}

async function upsertRecipe(databaseId, recipe) {
  const resolvedSchema = await getDatabaseSchema(databaseId)
  const existingPage = await findRecipePage(databaseId, recipe, resolvedSchema)
  const properties = buildRecipeProperties(recipe, resolvedSchema.schema, resolvedSchema.mapping)

  if (existingPage?.id) {
    await notionRequest(`/pages/${existingPage.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    })
    return { id: recipe.id, action: 'updated' }
  }

  const createdPage = await notionRequest('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: {
        database_id: databaseId,
      },
      properties,
    }),
  })

  return { id: recipe.id, action: 'created', pageId: createdPage.id }
}

export default async function handler(request, response) {
  setCors(request, response)
  const notionToken = normalizedEnv('NOTION_TOKEN')
  const notionRecipesDatabaseId = normalizedEnv('NOTION_RECIPES_DATABASE_ID')

  if (request.method === 'OPTIONS') {
    response.statusCode = 204
    response.end()
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  if (!notionToken || !notionRecipesDatabaseId) {
    sendJson(response, 503, {
      error: 'Notion bridge is not configured',
      requiredEnv: ['NOTION_TOKEN', 'NOTION_RECIPES_DATABASE_ID'],
    })
    return
  }

  try {
    const body = parseBody(request)
    const recipes = Array.isArray(body.recipes) ? body.recipes : []

    if (recipes.length === 0) {
      sendJson(response, 400, { error: 'No recipes supplied' })
      return
    }

    const results = []

    for (const recipe of recipes) {
      if (!recipe?.id || !recipe?.title) continue
      results.push(await upsertRecipe(notionRecipesDatabaseId, recipe))
    }

    sendJson(response, 200, {
      ok: true,
      synced: results.length,
      mapping: await getDatabaseSchema(notionRecipesDatabaseId),
      results,
    })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Recipe sync failed',
    })
  }
}
