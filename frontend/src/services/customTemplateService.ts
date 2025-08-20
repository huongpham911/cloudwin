import { UserDataTemplate } from '../data/userDataTemplates';

const CUSTOM_TEMPLATES_KEY = 'wincloud_custom_templates';

export interface CustomUserDataTemplate extends Omit<UserDataTemplate, 'category'> {
  category: 'custom';
  createdAt: string;
  updatedAt: string;
}

class CustomTemplateService {
  getCustomTemplates(): CustomUserDataTemplate[] {
    try {
      const templates = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
      return templates ? JSON.parse(templates) : [];
    } catch (error) {
      console.error('Error loading custom templates:', error);
      return [];
    }
  }

  saveCustomTemplate(template: Omit<CustomUserDataTemplate, 'id' | 'createdAt' | 'updatedAt'>): CustomUserDataTemplate {
    const templates = this.getCustomTemplates();
    const now = new Date().toISOString();
    
    const newTemplate: CustomUserDataTemplate = {
      ...template,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: 'custom',
      createdAt: now,
      updatedAt: now
    };

    templates.push(newTemplate);
    this.saveTemplates(templates);
    return newTemplate;
  }

  updateCustomTemplate(id: string, updates: Partial<Omit<CustomUserDataTemplate, 'id' | 'category' | 'createdAt'>>): CustomUserDataTemplate | null {
    const templates = this.getCustomTemplates();
    const templateIndex = templates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return null;
    }

    const updatedTemplate = {
      ...templates[templateIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    templates[templateIndex] = updatedTemplate;
    this.saveTemplates(templates);
    return updatedTemplate;
  }

  deleteCustomTemplate(id: string): boolean {
    const templates = this.getCustomTemplates();
    const filteredTemplates = templates.filter(t => t.id !== id);
    
    if (filteredTemplates.length === templates.length) {
      return false; // Template not found
    }

    this.saveTemplates(filteredTemplates);
    return true;
  }

  private saveTemplates(templates: CustomUserDataTemplate[]): void {
    try {
      localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving custom templates:', error);
    }
  }

  exportTemplates(): string {
    const templates = this.getCustomTemplates();
    return JSON.stringify(templates, null, 2);
  }

  importTemplates(jsonData: string): { success: boolean; message: string; count?: number } {
    try {
      const importedTemplates = JSON.parse(jsonData);
      
      if (!Array.isArray(importedTemplates)) {
        return { success: false, message: 'Invalid format: Expected an array of templates' };
      }

      const existingTemplates = this.getCustomTemplates();
      const validTemplates: CustomUserDataTemplate[] = [];

      for (const template of importedTemplates) {
        if (this.isValidTemplate(template)) {
          const now = new Date().toISOString();
          validTemplates.push({
            ...template,
            id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            category: 'custom',
            createdAt: template.createdAt || now,
            updatedAt: now
          });
        }
      }

      if (validTemplates.length === 0) {
        return { success: false, message: 'No valid templates found in the import data' };
      }

      const allTemplates = [...existingTemplates, ...validTemplates];
      this.saveTemplates(allTemplates);

      return { 
        success: true, 
        message: `Successfully imported ${validTemplates.length} template(s)`,
        count: validTemplates.length
      };
    } catch (error) {
      return { success: false, message: 'Invalid JSON format' };
    }
  }

  private isValidTemplate(template: any): boolean {
    return (
      template &&
      typeof template.name === 'string' &&
      typeof template.description === 'string' &&
      typeof template.script === 'string' &&
      template.name.trim() !== '' &&
      template.script.trim() !== ''
    );
  }
}

export const customTemplateService = new CustomTemplateService();
