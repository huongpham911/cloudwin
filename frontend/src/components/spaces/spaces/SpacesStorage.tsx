import React, { useState } from 'react'
import { Tab } from '@headlessui/react'
import { CloudIcon, KeyIcon } from '@heroicons/react/24/outline'
import SpacesBuckets from './SpacesBuckets'
import SpacesAccessKeys from './SpacesAccessKeys'

const SpacesStorage: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const tabs = [
    {
      name: 'Buckets',
      icon: CloudIcon,
      component: SpacesBuckets
    },
    {
      name: 'Access Keys',
      icon: KeyIcon,
      component: SpacesAccessKeys
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Spaces Object Storage
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            S3-compatible object storage with a built-in CDN that makes scaling easy, reliable, and affordable.
          </p>
        </div>

        {/* Tabs */}
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8">
            {tabs.map((tab, index) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  `w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5 text-blue-700 dark:text-blue-300 
                  ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2
                  ${selected
                    ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </div>
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            {tabs.map((tab) => (
              <Tab.Panel
                key={tab.name}
                className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-md"
              >
                <tab.component />
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  )
}

export default SpacesStorage
