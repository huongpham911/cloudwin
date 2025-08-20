"""
DigitalOcean GenAI Service
Handles all GenAI operations including workspaces, agents, knowledge bases, and story generation
"""
import logging
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydo import Client

logger = logging.getLogger(__name__)

class GenAIService:
    def __init__(self, token: str):
        self.client = Client(token=token)
        self.token = token

    async def list_workspaces(self) -> Dict[str, Any]:
        """List all GenAI workspaces"""
        try:
            response = self.client.genai.list_workspaces()
            
            if hasattr(response, 'workspaces'):
                workspaces = response.workspaces
            elif isinstance(response, dict) and 'workspaces' in response:
                workspaces = response['workspaces']
            else:
                workspaces = response if isinstance(response, list) else []
            
            return {
                "success": True,
                "workspaces": workspaces,
                "count": len(workspaces)
            }
        except Exception as e:
            logger.error(f"Failed to list workspaces: {e}")
            return {
                "success": False,
                "error": str(e),
                "workspaces": []
            }

    async def create_workspace(self, name: str, description: str = "") -> Dict[str, Any]:
        """Create a new GenAI workspace"""
        try:
            create_data = {
                "name": name,
                "description": description
            }
            
            response = self.client.genai.create_workspace(body=create_data)
            
            if hasattr(response, 'workspace'):
                workspace = response.workspace
            elif isinstance(response, dict) and 'workspace' in response:
                workspace = response['workspace']
            else:
                workspace = response
            
            return {
                "success": True,
                "workspace": workspace
            }
        except Exception as e:
            logger.error(f"Failed to create workspace: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def list_agents(self) -> Dict[str, Any]:
        """List all GenAI agents"""
        try:
            response = self.client.genai.list_agents()
            
            if hasattr(response, 'agents'):
                agents = response.agents
            elif isinstance(response, dict) and 'agents' in response:
                agents = response['agents']
            else:
                agents = response if isinstance(response, list) else []
            
            return {
                "success": True,
                "agents": agents,
                "count": len(agents)
            }
        except Exception as e:
            logger.error(f"Failed to list agents: {e}")
            return {
                "success": False,
                "error": str(e),
                "agents": []
            }

    async def create_agent(self, 
                          name: str,
                          model: Optional[str] = None,
                          instructions: str = "You are a helpful assistant.",
                          description: str = "",
                          workspace_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new GenAI agent"""
        try:
            # Build create data - minimal required fields only
            create_data = {
                "name": name
            }
            
            # Add optional fields only if provided and non-empty
            if description and description.strip():
                create_data["description"] = description.strip()
                
            if instructions and instructions.strip() and instructions.strip() != "You are a helpful assistant.":
                create_data["instructions"] = instructions.strip()
                
            if workspace_id and workspace_id.strip():
                create_data["workspace_id"] = workspace_id.strip()
            
            # DO NOT ADD MODEL FIELD AT ALL if empty or invalid
            # DigitalOcean API requires valid UUID or nothing
            if model and model.strip() and len(model.strip()) > 30 and '-' in model.strip():
                create_data["model"] = model.strip()
                logger.info(f"Using model: {model.strip()}")
            else:
                logger.info(f"Skipping model field - model value was: '{model}' (None, empty, or invalid format)")
                # Explicitly do not add model field to avoid UUID validation error
            
            logger.info(f"Creating agent with data: {create_data}")
            
            # Log exactly what we're sending to DigitalOcean API
            logger.info(f"=== DEBUG: Final payload to DigitalOcean API ===")
            logger.info(f"Keys in payload: {list(create_data.keys())}")
            for key, value in create_data.items():
                logger.info(f"  {key}: '{value}' (type: {type(value).__name__}, length: {len(str(value)) if value else 0})")
            logger.info("=== END DEBUG ===")
            
            # Let's check what PyDO client actually does
            import json as json_module
            logger.info(f"=== PYDO CLIENT DEBUG ===")
            logger.info(f"Client token: {self.token[:10]}...")
            logger.info(f"Body being passed to PyDO: {json_module.dumps(create_data, indent=2)}")
            logger.info(f"Client type: {type(self.client)}")
            logger.info(f"GenAI service type: {type(self.client.genai)}")
            
            response = self.client.genai.create_agent(body=create_data)
            
            if hasattr(response, 'agent'):
                agent = response.agent
            elif isinstance(response, dict) and 'agent' in response:
                agent = response['agent']
            else:
                agent = response
            
            return {
                "success": True,
                "agent": agent
            }
        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_agent(self, agent_id: str) -> Dict[str, Any]:
        """Get details of a specific GenAI agent"""
        try:
            response = self.client.genai.get_agent(agent_id)
            
            if hasattr(response, 'agent'):
                agent = response.agent
            elif isinstance(response, dict) and 'agent' in response:
                agent = response['agent']
            else:
                agent = response
            
            return {
                "success": True,
                "agent": agent
            }
        except Exception as e:
            logger.error(f"Failed to get agent {agent_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def update_agent(self, agent_id: str, **kwargs) -> Dict[str, Any]:
        """Update a GenAI agent"""
        try:
            update_data = {}
            
            # Filter valid update fields
            valid_fields = ["name", "description", "system_prompt", "model"]
            for field in valid_fields:
                if field in kwargs and kwargs[field] is not None:
                    update_data[field] = kwargs[field]
            
            if not update_data:
                return {
                    "success": False,
                    "error": "No valid fields to update"
                }
            
            response = self.client.genai.update_agent(agent_id, body=update_data)
            
            if hasattr(response, 'agent'):
                agent = response.agent
            elif isinstance(response, dict) and 'agent' in response:
                agent = response['agent']
            else:
                agent = response
            
            return {
                "success": True,
                "agent": agent
            }
        except Exception as e:
            logger.error(f"Failed to update agent {agent_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def delete_agent(self, agent_id: str) -> Dict[str, Any]:
        """Delete a GenAI agent"""
        try:
            self.client.genai.delete_agent(agent_id)
            
            return {
                "success": True,
                "message": f"Agent {agent_id} deleted successfully"
            }
        except Exception as e:
            logger.error(f"Failed to delete agent {agent_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def list_knowledge_bases(self) -> Dict[str, Any]:
        """List all GenAI knowledge bases"""
        try:
            response = self.client.genai.list_knowledge_bases()
            
            if hasattr(response, 'knowledge_bases'):
                knowledge_bases = response.knowledge_bases
            elif isinstance(response, dict) and 'knowledge_bases' in response:
                knowledge_bases = response['knowledge_bases']
            else:
                knowledge_bases = response if isinstance(response, list) else []
            
            return {
                "success": True,
                "knowledge_bases": knowledge_bases,
                "count": len(knowledge_bases)
            }
        except Exception as e:
            logger.error(f"Failed to list knowledge bases: {e}")
            return {
                "success": False,
                "error": str(e),
                "knowledge_bases": []
            }

    async def create_knowledge_base(self, 
                                   name: str,
                                   description: str = "",
                                   workspace_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a new GenAI knowledge base"""
        try:
            create_data = {
                "name": name,
                "description": description
            }
            
            if workspace_id:
                create_data["workspace_id"] = workspace_id
            
            # Remove None values
            create_data = {k: v for k, v in create_data.items() if v is not None}
            
            response = self.client.genai.create_knowledge_base(body=create_data)
            
            if hasattr(response, 'knowledge_base'):
                knowledge_base = response.knowledge_base
            elif isinstance(response, dict) and 'knowledge_base' in response:
                knowledge_base = response['knowledge_base']
            else:
                knowledge_base = response
            
            return {
                "success": True,
                "knowledge_base": knowledge_base
            }
        except Exception as e:
            logger.error(f"Failed to create knowledge base: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def list_models(self) -> Dict[str, Any]:
        """List available GenAI models"""
        try:
            response = self.client.genai.list_models()
            
            if hasattr(response, 'models'):
                models = response.models
            elif isinstance(response, dict) and 'models' in response:
                models = response['models']
            else:
                models = response if isinstance(response, list) else []
            
            return {
                "success": True,
                "models": models,
                "count": len(models)
            }
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return {
                "success": False,
                "error": str(e),
                "models": []
            }

    async def create_agent_api_key(self, agent_id: str, key_name: str) -> Dict[str, Any]:
        """Create API key for a GenAI agent"""
        try:
            create_data = {
                "name": key_name
            }
            
            response = self.client.genai.create_agent_api_key(agent_id, body=create_data)
            
            if hasattr(response, 'api_key'):
                api_key = response.api_key
            elif isinstance(response, dict) and 'api_key' in response:
                api_key = response['api_key']
            else:
                api_key = response
            
            return {
                "success": True,
                "api_key": api_key
            }
        except Exception as e:
            logger.error(f"Failed to create API key for agent {agent_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def list_agent_api_keys(self, agent_id: str) -> Dict[str, Any]:
        """List API keys for a GenAI agent"""
        try:
            response = self.client.genai.list_agent_api_keys(agent_id)
            
            if hasattr(response, 'api_keys'):
                api_keys = response.api_keys
            elif isinstance(response, dict) and 'api_keys' in response:
                api_keys = response['api_keys']
            else:
                api_keys = response if isinstance(response, list) else []
            
            return {
                "success": True,
                "api_keys": api_keys,
                "count": len(api_keys)
            }
        except Exception as e:
            logger.error(f"Failed to list API keys for agent {agent_id}: {e}")
            return {
                "success": False,
                "error": str(e),
                "api_keys": []
            }

    async def attach_knowledge_base_to_agent(self, agent_id: str, knowledge_base_id: str) -> Dict[str, Any]:
        """Attach a knowledge base to an agent"""
        try:
            attach_data = {
                "knowledge_base_id": knowledge_base_id
            }
            
            response = self.client.genai.attach_knowledge_base(agent_id, body=attach_data)
            
            return {
                "success": True,
                "message": f"Knowledge base {knowledge_base_id} attached to agent {agent_id}",
                "response": response
            }
        except Exception as e:
            logger.error(f"Failed to attach knowledge base to agent: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    # Story Generation Helper Methods
    async def generate_story_prompt(self, 
                                   genre: str = "general",
                                   length: str = "short",
                                   characters: List[str] = None,
                                   setting: str = "",
                                   theme: str = "",
                                   tone: str = "neutral") -> str:
        """Generate a structured prompt for story creation"""
        
        characters = characters or []
        
        length_guidelines = {
            "short": "500-800 words",
            "medium": "1,500-2,500 words", 
            "long": "3,000-5,000 words"
        }
        
        prompt = f"""
Create a {length} {genre} story ({length_guidelines.get(length, '500-800 words')}) with the following specifications:

STORY PARAMETERS:
- Genre: {genre.title()}
- Length: {length.title()} ({length_guidelines.get(length, '500-800 words')})
- Setting: {setting if setting else 'Create an appropriate setting for this genre'}
- Theme: {theme if theme else 'Create a meaningful theme appropriate for the genre'}
- Tone: {tone.title()}
- Characters: {', '.join(characters) if characters else 'Create 2-3 well-developed characters'}

STRUCTURE REQUIREMENTS:
1. **Title**: Create an engaging, genre-appropriate title
2. **Opening**: Strong hook that establishes setting and introduces main character
3. **Character Development**: Show character personalities through actions and dialogue
4. **Plot Development**: Clear beginning, middle, and end with appropriate pacing
5. **Conflict**: Introduce and resolve a meaningful conflict
6. **Climax**: Build to an exciting or emotionally satisfying climax
7. **Resolution**: Provide a satisfying conclusion that ties up loose ends

STYLE GUIDELINES:
- Use vivid, descriptive language appropriate to the {genre} genre
- Include dialogue that reveals character personality
- Maintain consistent {tone} tone throughout
- Show don't tell - use actions and scenes to convey information
- Include sensory details to make scenes come alive

OUTPUT FORMAT:
Please format your response as a JSON object with these fields:
{{
    "title": "story title here",
    "content": "full story content here",
    "characters": ["character1", "character2", "character3"],
    "word_count": estimated_word_count,
    "genre": "{genre}",
    "summary": "brief 2-3 sentence story summary",
    "themes": ["main theme", "secondary theme"],
    "setting_details": "description of where/when the story takes place"
}}

Begin writing the story now:
"""
        return prompt

    async def generate_character_prompt(self,
                                       num_characters: int = 3,
                                       genre: str = "general",
                                       story_role: str = "any") -> str:
        """Generate a prompt for character creation"""
        
        roles = ["protagonist", "mentor", "antagonist", "sidekick", "love_interest", "supporting_character"]
        
        prompt = f"""
Create {num_characters} unique characters for a {genre} story. Each character should be fully developed with the following details:

CHARACTER REQUIREMENTS:
- Genre: {genre.title()}
- Story Role Focus: {story_role if story_role != 'any' else 'Mix of different roles'}
- Number of Characters: {num_characters}

FOR EACH CHARACTER, PROVIDE:
1. **Name**: Genre-appropriate name
2. **Role**: Story function (protagonist, antagonist, mentor, etc.)
3. **Age**: Specific age and life stage
4. **Personality**: 3-4 key personality traits with examples
5. **Background**: Personal history and how it shaped them
6. **Motivation**: What drives this character (goals, fears, desires)
7. **Appearance**: Physical description including distinctive features
8. **Skills/Abilities**: What they're good at (include both strengths and weaknesses)
9. **Speech Pattern**: How they talk (formal/casual, accent, catchphrases)
10. **Character Arc**: How they might grow/change during the story
11. **Relationships**: How they might interact with other characters
12. **Secrets**: Something hidden about their past or nature

GENRE-SPECIFIC GUIDELINES:
- Make characters appropriate for {genre} genre
- Consider typical {genre} character archetypes while adding unique twists
- Ensure characters have depth beyond their genre roles
- Create potential for interesting conflicts and relationships

OUTPUT FORMAT:
Please format your response as a JSON object:
{{
    "characters": [
        {{
            "name": "character name",
            "role": "story role",
            "age": number,
            "personality": ["trait1", "trait2", "trait3"],
            "personality_description": "detailed personality explanation",
            "background": "character backstory",
            "motivation": "what drives them",
            "appearance": "physical description",
            "skills": ["skill1", "skill2", "skill3"],
            "weaknesses": ["weakness1", "weakness2"],
            "speech_pattern": "how they speak",
            "character_arc": "potential growth/change",
            "relationships": "how they relate to others",
            "secrets": "hidden aspects",
            "quotes": ["example quote 1", "example quote 2"]
        }}
    ],
    "genre": "{genre}",
    "character_dynamics": "how these characters might interact",
    "story_potential": "what kind of conflicts/plots these characters suggest"
}}

Create the characters now:
"""
        return prompt


def get_genai_service(token: str) -> GenAIService:
    """Factory function to create GenAI service instance"""
    return GenAIService(token)
