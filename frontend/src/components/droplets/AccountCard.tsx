import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '../../contexts/ThemeContext'
import { 
  UserIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { accountsApi, type DigitalOceanAccount, type AccountBilling } from '../../services/accounts'

interface AccountCardProps {
  account: DigitalOceanAccount
  totalDroplets: number
  activeDroplets: number
}

const AccountCard: React.FC<AccountCardProps> = ({ account, totalDroplets, activeDroplets }) => {
  const { isDark } = useTheme()
  const [isExpanded, setIsExpanded] = useState(false)

  // Get detailed billing info when expanded
  const { data: billingInfo, isLoading: isBillingLoading } = useQuery({
    queryKey: ['account-billing', account.account_id],
    queryFn: () => accountsApi.getAccountBilling(account.account_id),
    enabled: isExpanded,
    select: (response) => response.data
  })

  const getStatusIcon = () => {
    if (account.error) {
      return <XCircleIcon className="w-5 h-5 text-red-500" />
    }
    if (account.status === 'active' && account.email_verified) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />
    }
    return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
  }

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg transition-colors duration-300`}>
      <div className="p-5">
        <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                account.error ? 'bg-red-100' : 
                account.status === 'active' ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <UserIcon className={`h-6 w-6 ${
                  account.error ? 'text-red-600' : 
                  account.status === 'active' ? 'text-green-600' : 'text-yellow-600'
              }`} />
            </div>
          </div>
          
            <div>
            <div className="flex items-center space-x-2">
                <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {account.name || account.account_name || `Account ${account.account_id + 1}`}
              </h3>
              {getStatusIcon()}
            </div>
            
              <div className="flex items-center space-x-4 mt-1">
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  {account.email !== 'Unknown' && account.email !== 'Error loading account' ? 
                    account.email : 
                    `Account ID: ${account.account_id}`
                  }
              </p>
                {account.email_verified && account.email !== 'Unknown' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
            )}
          </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Droplets Count */}
            <div className="text-center">
              <div className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {totalDroplets}
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Droplets
              </div>
            </div>
            
            {/* Balance or Credits */}
            {!account.error && (
              <div className="text-center">
                {account.credits_info?.remaining_credits && parseFloat(account.credits_info.remaining_credits) > 0 ? (
                  // Show credits for education accounts
                  <div>
                    <div className={`text-lg font-semibold ${
                      isDark ? 'text-green-400' : 'text-green-600'
                    }`}>
                      ${account.credits_info.remaining_credits}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Credits Left
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      of ${account.credits_info.total_credits}
                    </div>
                  </div>
                ) : account.account_balance && account.account_balance !== '0.00' && account.account_balance !== 'N/A' ? (
                  // Show regular balance
                  <div>
                    <div className={`text-lg font-semibold ${
                      isDark ? 'text-green-400' : 'text-green-600'
                    }`}>
                      ${account.account_balance}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Balance
                    </div>
                  </div>
                ) : null}
            </div>
          )}
          
            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-2 rounded-md transition-colors ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
              disabled={!!account.error}
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {account.error && (
          <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200">
            <div className="flex">
              <XCircleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Failed to load account information
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {account.error}
                </div>
              </div>
        </div>
      </div>
        )}

      {/* Expanded Details */}
      {isExpanded && !account.error && (
        <div className={`mt-4 pt-4 border-t ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="grid grid-cols-2 gap-4">
            {/* Account Info */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Account Information
              </h4>
              
              <div className="space-y-2">
                <div>
                  <span className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>Status:</span>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className={`text-sm capitalize ${
                      account.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                        {account.status || 'Unknown'}
                    </span>
                    {account.email_verified && (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
                  
                  {account.uuid && (
                    <div>
                      <span className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>UUID:</span>
                      <div className={`text-sm mt-1 font-mono ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {account.uuid.substring(0, 8)}...
                      </div>
                    </div>
                  )}
                
                <div>
                  <span className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>Limits:</span>
                  <div className={`text-sm mt-1 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                      Droplets: {account.droplet_limit || 0} | IPs: {account.floating_ip_limit || 0} | Volumes: {account.volume_limit || 0}
                  </div>
                </div>
                
                <div>
                  <span className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}>Droplets Usage:</span>
                  <div className={`text-sm mt-1 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {activeDroplets} active / {totalDroplets} total
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Info */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Billing Information
              </h4>
              
              {isBillingLoading ? (
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Loading billing info...
                </div>
              ) : billingInfo ? (
                <div className="space-y-2">
                  <div>
                    <span className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>Account Balance:</span>
                    <div className={`text-sm font-medium mt-1 ${
                      isDark ? 'text-green-400' : 'text-green-600'
                    }`}>
                        ${billingInfo.balance.account_balance || '0.00'}
                    </div>
                  </div>
                  
                  <div>
                    <span className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>Month to Date:</span>
                    <div className={`text-sm mt-1 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        Usage: ${billingInfo.balance.month_to_date_usage || '0.00'}
                    </div>
                    <div className={`text-sm ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        Balance: ${billingInfo.balance.month_to_date_balance || '0.00'}
                    </div>
                  </div>
                  
                  {billingInfo.total_invoices > 0 && (
                    <div>
                      <span className={`text-xs ${
                        isDark ? 'text-gray-400' : 'text-gray-500'
                      }`}>Invoices:</span>
                      <div className={`text-sm mt-1 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {billingInfo.total_invoices} total invoices
                      </div>
                    </div>
                  )}
                    
                    {billingInfo.balance.generated_at && (
                      <div>
                        <span className={`text-xs ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>Last Updated:</span>
                        <div className={`text-sm mt-1 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {new Date(billingInfo.balance.generated_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                  <div className="space-y-2">
                    {/* Show credits info if available */}
                    {account.credits_info?.remaining_credits && parseFloat(account.credits_info.remaining_credits) > 0 ? (
                      <div>
                        <span className={`text-xs ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>Education Credits:</span>
                        <div className={`text-sm font-medium mt-1 ${
                          isDark ? 'text-green-400' : 'text-green-600'
                        }`}>
                          ${account.credits_info.remaining_credits} remaining
                        </div>
                        <div className={`text-xs mt-1 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                          Total: ${account.credits_info.total_credits} | Used: ${account.credits_info.used_credits}
                        </div>
                        {account.credits_info.credits_expire_date && (
                          <div className={`text-xs mt-1 ${
                            isDark ? 'text-yellow-400' : 'text-yellow-600'
                          }`}>
                            Expires: {new Date(account.credits_info.credits_expire_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className={`text-xs ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>Account Balance:</span>
                        <div className={`text-sm font-medium mt-1 ${
                          isDark ? 'text-green-400' : 'text-green-600'
                        }`}>
                          ${account.account_balance || '0.00'}
                        </div>
                      </div>
                    )}
                    
                    {account.month_to_date_usage && (
                      <div>
                        <span className={`text-xs ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>Month to Date Usage:</span>
                        <div className={`text-sm mt-1 ${
                          isDark ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          ${account.month_to_date_usage}
                  </div>
                </div>
              )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  )
}

export default AccountCard 