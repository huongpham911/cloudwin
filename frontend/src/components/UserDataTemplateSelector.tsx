import React, { useState, useEffect } from 'react';
import { UserDataTemplate, userDataTemplates, getTemplatesByCategory } from '../data/userDataTemplates';
import { customTemplateService, CustomUserDataTemplate } from '../services/customTemplateService';
import { 
  CodeBracketIcon,
  XMarkIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  CommandLineIcon,
  BookmarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface UserDataTemplateSelectorProps {
  isDark: boolean;
  onSelectTemplate: (script: string) => void;
  currentScript?: string;
}

export const UserDataTemplateSelector: React.FC<UserDataTemplateSelectorProps> = ({
  isDark,
  onSelectTemplate,
  currentScript = ''
}) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'windows' | 'linux' | 'custom' | 'all'>('all');
  const [customTemplates, setCustomTemplates] = useState<CustomUserDataTemplate[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateDescription, setSaveTemplateDescription] = useState('');

  useEffect(() => {
    loadCustomTemplates();
  }, []);

  const loadCustomTemplates = () => {
    const templates = customTemplateService.getCustomTemplates();
    setCustomTemplates(templates);
  };

  const handleSaveTemplate = () => {
    if (!saveTemplateName.trim() || !currentScript.trim()) {
      return;
    }

    customTemplateService.saveCustomTemplate({
      name: saveTemplateName.trim(),
      description: saveTemplateDescription.trim() || 'Custom user data script',
      script: currentScript,
      icon: '⚙️',
      category: 'custom'
    });

    loadCustomTemplates();
    setSaveTemplateName('');
    setSaveTemplateDescription('');
    setShowSaveModal(false);
  };

  const handleDeleteCustomTemplate = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      customTemplateService.deleteCustomTemplate(id);
      loadCustomTemplates();
    }
  };

  const handleTemplateSelect = (template: UserDataTemplate | CustomUserDataTemplate) => {
    onSelectTemplate(template.script);
    setShowTemplates(false);
  };

  const getFilteredTemplates = (): (UserDataTemplate | CustomUserDataTemplate)[] => {
    let allTemplates: (UserDataTemplate | CustomUserDataTemplate)[] = [...userDataTemplates];
    
    if (selectedCategory === 'custom') {
      return customTemplates;
    }
    
    if (selectedCategory === 'all') {
      allTemplates = [...userDataTemplates, ...customTemplates];
    } else {
      allTemplates = getTemplatesByCategory(selectedCategory as 'windows' | 'linux');
    }
    
    return allTemplates;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'windows':
        return <ComputerDesktopIcon className="h-4 w-4" />;
      case 'linux':
        return <CommandLineIcon className="h-4 w-4" />;
      default:
        return <DocumentTextIcon className="h-4 w-4" />;
    }
  };

  if (!showTemplates) {
    return (
      <div className="mb-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className={`inline-flex items-center px-3 py-1.5 border ${
              isDark 
                ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            } rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Choose Template
          </button>
          
          {currentScript && (
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className={`inline-flex items-center px-3 py-1.5 border ${
                isDark 
                  ? 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              } rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Save as Template
            </button>
          )}
        </div>
        
        {currentScript && (
          <span className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} block`}>
            Script loaded ({currentScript.split('\n').length} lines)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`mb-4 border ${isDark ? 'border-gray-600' : 'border-gray-300'} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          Select User Data Template
        </h3>
        <button
          type="button"
          onClick={() => setShowTemplates(false)}
          className={`p-1 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex space-x-2 mb-3">
        {[
          { key: 'all', label: 'All', icon: <DocumentTextIcon className="h-4 w-4" /> },
          { key: 'windows', label: 'Windows', icon: <ComputerDesktopIcon className="h-4 w-4" /> },
          { key: 'linux', label: 'Linux', icon: <CommandLineIcon className="h-4 w-4" /> },
          { key: 'custom', label: `Custom (${customTemplates.length})`, icon: <BookmarkIcon className="h-4 w-4" /> },
        ].map((category) => (
          <button
            key={category.key}
            type="button"
            onClick={() => setSelectedCategory(category.key as any)}
            className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedCategory === category.key
                ? isDark
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white'
                : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.icon}
            <span className="ml-1">{category.label}</span>
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {getFilteredTemplates().map((template) => (
          <div
            key={template.id}
            className={`cursor-pointer border ${
              isDark 
                ? 'border-gray-600 bg-gray-800 hover:bg-gray-700' 
                : 'border-gray-200 bg-white hover:bg-gray-50'
            } rounded-lg p-3 transition-colors relative group`}
          >
            <div onClick={() => handleTemplateSelect(template)} className="flex items-start space-x-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-md ${
                template.category === 'windows'
                  ? 'bg-blue-100 text-blue-600'
                  : template.category === 'linux'
                    ? 'bg-green-100 text-green-600'
                    : template.category === 'custom'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-600'
              }`}>
                {template.icon ? (
                  <span className="text-sm">{template.icon}</span>
                ) : (
                  getCategoryIcon(template.category)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {template.name}
                </h4>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1 line-clamp-2`}>
                  {template.description}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    template.category === 'windows'
                      ? 'bg-blue-100 text-blue-800'
                      : template.category === 'linux'
                        ? 'bg-green-100 text-green-800'
                        : template.category === 'custom'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}>
                    {getCategoryIcon(template.category)}
                    <span className="ml-1 capitalize">{template.category}</span>
                  </span>
                </div>
              </div>
            </div>
            
            {/* Delete button for custom templates */}
            {template.category === 'custom' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCustomTemplate(template.id);
                }}
                className={`absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                  isDark 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-100 hover:bg-red-200 text-red-600'
                }`}
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {getFilteredTemplates().length === 0 && (
        <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <CodeBracketIcon className="mx-auto h-8 w-8 mb-2" />
          <p className="text-sm">No templates found for this category</p>
        </div>
      )}

      <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          💡 Click on a template to load it into the script editor. You can modify the script after loading.
        </p>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className={`inline-block align-bottom ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6`}>
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <BookmarkIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className={`text-lg leading-6 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Save as Custom Template
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} text-left`}>
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={saveTemplateName}
                        onChange={(e) => setSaveTemplateName(e.target.value)}
                        className={`mt-1 block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="My Custom Script"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} text-left`}>
                        Description (Optional)
                      </label>
                      <textarea
                        value={saveTemplateDescription}
                        onChange={(e) => setSaveTemplateDescription(e.target.value)}
                        rows={2}
                        className={`mt-1 block w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="Description of what this script does..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!saveTemplateName.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false);
                    setSaveTemplateName('');
                    setSaveTemplateDescription('');
                  }}
                  className={`mt-3 w-full inline-flex justify-center rounded-md border ${isDark ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
