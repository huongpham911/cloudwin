"""
Alternative GenAI Service using direct HTTP requests
This bypasses PyDO client issues with model UUID validation
"""
import logging
import json
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class DirectGenAIService:
    """Direct HTTP-based GenAI Service to avoid PyDO client issues"""
    
    def __init__(self, token: str, model_access_key: Optional[str] = None):
        self.token = token
        self.model_access_key = model_access_key
        self.base_url = "https://api.digitalocean.com/v2/gen-ai"
        self.serverless_url = "https://inference.do-ai.run/v1"
        
        # Use regular DO token for GenAI management API (agents, workspaces)
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Use Model Access Key for serverless inference if available
        if model_access_key:
            self.serverless_headers = {
                "Authorization": f"Bearer {model_access_key}",
                "Content-Type": "application/json"
            }
            logger.info("Model Access Key configured for serverless inference")
        else:
            self.serverless_headers = self.headers
            logger.warning("No Model Access Key - using regular token for all APIs")
        
    async def create_agent(self, 
                          name: str,
                          model: Optional[str] = None,
                          instructions: str = "You are a helpful assistant.",
                          description: str = "",
                          workspace_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new GenAI agent using direct HTTP requests"""
        try:
            # Build create data - minimal required fields only
            create_data = {
                "name": name
            }
            
            # Add optional fields only if provided and non-empty
            if description and description.strip():
                create_data["description"] = description.strip()

            if instructions and instructions.strip():
                create_data["instruction"] = instructions.strip()  # Note: singular "instruction" not "instructions"
                
            if workspace_id and workspace_id.strip():
                create_data["workspace_id"] = workspace_id.strip()

            # Add required region field - default to tor1 (Toronto)
            create_data["region"] = "tor1"

            # Add required project_id - get from DigitalOcean API
            try:
                projects_response = requests.get(
                    "https://api.digitalocean.com/v2/projects",
                    headers=self.headers,
                    timeout=10
                )
                if projects_response.status_code == 200:
                    projects_data = projects_response.json()
                    projects = projects_data.get("projects", [])
                    if projects:
                        # Use the first project (usually the default project)
                        default_project = projects[0]
                        create_data["project_id"] = default_project.get("id")
                        logger.info(f"Using project: {default_project.get('name')} ({default_project.get('id')})")
                    else:
                        logger.error("No projects found")
                        return {
                            "success": False,
                            "error": "No projects available"
                        }
                else:
                    logger.error(f"Failed to get projects: {projects_response.status_code}")
                    return {
                        "success": False,
                        "error": f"Failed to get projects: {projects_response.status_code}"
                    }
            except Exception as e:
                logger.error(f"Error getting projects: {e}")
                return {
                    "success": False,
                    "error": f"Error getting projects: {e}"
                }
            
            # Handle model field - if not provided, get a default model
            # Check if it's a UUID (36 chars with dashes) or model ID
            if model and model.strip():
                model_val = model.strip()
                if len(model_val) == 36 and model_val.count('-') == 4:
                    # It's a UUID
                    create_data["model_uuid"] = model_val
                    logger.info(f"Using provided model UUID: {model_val}")
                elif len(model_val) > 5:
                    # It might be a model ID, try to find the UUID
                    logger.info(f"Provided model appears to be ID: {model_val}, looking up UUID...")
                    models_result = await self.list_models()
                    if models_result.get("success") and models_result.get("models"):
                        for m in models_result["models"]:
                            if m.get("id") == model_val:
                                create_data["model_uuid"] = m.get("uuid")
                                logger.info(f"Found UUID for model ID {model_val}: {m.get('uuid')}")
                                break
                        else:
                            logger.warning(f"Could not find UUID for model ID: {model_val}, using default")
                            # Fall through to default model selection
                            model = None
                    else:
                        logger.warning(f"Could not lookup models, using default")
                        model = None
                else:
                    logger.warning(f"Invalid model format: {model_val}, using default")
                    model = None

            # If no valid model was provided or found, get a default model from the API
            if not model or "model_uuid" not in create_data:
                logger.info("No valid model provided, getting default model from API...")
                models_result = await self.list_models()
                
                if models_result.get("success") and models_result.get("models"):
                    default_model = models_result["models"][0]
                    model_uuid = default_model.get("uuid")
                    model_name = default_model.get("name", "Unknown")

                    if model_uuid:
                        create_data["model_uuid"] = model_uuid
                        logger.info(f"Using default model: {model_name} (UUID: {model_uuid})")
                    else:
                        logger.error("Default model has no UUID")
                        return {
                            "success": False,
                            "error": "No valid models available"
                        }
                else:
                    logger.error("Failed to get models for default model")
                    return {
                        "success": False,
                        "error": "Could not retrieve models to select default"
                    }
            
            logger.info(f"Creating agent with data: {create_data}")
            
            url = f"{self.base_url}/agents"
            
            response = requests.post(
                url,
                json=create_data,
                headers=self.headers,
                timeout=30
            )
            
            logger.info(f"Direct API response: Status={response.status_code}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                agent = result.get('agent', result)

                logger.info(f"✅ Agent created successfully via direct API")
                return {
                    "success": True,
                    "agent": agent
                }
            else:
                error_msg = response.text
                logger.error(f"Direct API error: {error_msg}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {error_msg}"
                }
                
        except Exception as e:
            logger.error(f"Failed to create agent via direct API: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def list_agents(self) -> Dict[str, Any]:
        """List all GenAI agents"""
        try:
            url = f"{self.base_url}/agents"
            
            response = requests.get(
                url,
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                agents = result.get('agents', [])
                
                return {
                    "success": True,
                    "agents": agents,
                    "count": len(agents)
                }
            else:
                error_msg = response.text
                logger.error(f"Failed to list agents: {error_msg}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {error_msg}",
                    "agents": []
                }
                
        except Exception as e:
            logger.error(f"Failed to list agents: {e}")
            return {
                "success": False,
                "error": str(e),
                "agents": []
            }
    
    async def list_models(self) -> Dict[str, Any]:
        """List available GenAI models from both APIs"""
        try:
            # Try to get models from regular GenAI API first
            url = f"{self.base_url}/models"
            
            response = requests.get(
                url,
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                models = result.get('models', [])
                
                logger.info(f"✅ Got {len(models)} models from GenAI API")
                return {
                    "success": True,
                    "models": models,
                    "count": len(models),
                    "source": "genai_api"
                }
            else:
                # If GenAI API fails, try serverless inference API
                logger.warning(f"GenAI API failed: {response.status_code}, trying serverless API...")
                
                serverless_response = requests.get(
                    f"{self.serverless_url}/models",
                    headers=self.serverless_headers,
                    timeout=30
                )
                
                if serverless_response.status_code == 200:
                    result = serverless_response.json()
                    serverless_models = result.get('data', [])
                    
                    # Convert serverless format to GenAI format
                    models = []
                    for model in serverless_models:
                        models.append({
                            "id": model.get("id"),
                            "uuid": model.get("id"),  # Use id as uuid for compatibility
                            "name": model.get("id").replace("-", " ").title(),
                            "provider": model.get("owned_by", "unknown"),
                            "description": f"Model from {model.get('owned_by', 'unknown')} provider"
                        })
                    
                    logger.info(f"✅ Got {len(models)} models from serverless API")
                    return {
                        "success": True,
                        "models": models,
                        "count": len(models),
                        "source": "serverless_api"
                    }
                else:
                    error_msg = serverless_response.text
                    logger.error(f"Both APIs failed. Serverless error: {error_msg}")
                    return {
                        "success": False,
                        "error": f"GenAI API: HTTP {response.status_code}, Serverless API: HTTP {serverless_response.status_code}",
                        "models": []
                    }
                
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return {
                "success": False,
                "error": str(e),
                "models": []
            }
    
    async def list_workspaces(self) -> Dict[str, Any]:
        """List all GenAI workspaces"""
        try:
            url = f"{self.base_url}/workspaces"
            
            response = requests.get(
                url,
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                workspaces = result.get('workspaces', [])
                
                return {
                    "success": True,
                    "workspaces": workspaces,
                    "count": len(workspaces)
                }
            else:
                error_msg = response.text
                logger.error(f"Failed to list workspaces: {error_msg}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {error_msg}",
                    "workspaces": []
                }
                
        except Exception as e:
            logger.error(f"Failed to list workspaces: {e}")
            return {
                "success": False,
                "error": str(e),
                "workspaces": []
            }

def get_direct_genai_service(token: str, model_access_key: Optional[str] = None) -> DirectGenAIService:
    """Factory function to create Direct GenAI service instance"""
    return DirectGenAIService(token, model_access_key)
