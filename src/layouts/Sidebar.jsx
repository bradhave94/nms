import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  CalculatorIcon,
  FunnelIcon,
  WrenchScrewdriverIcon,
  CakeIcon,
  XMarkIcon,
  HomeIcon,
  HomeModernIcon,
  QuestionMarkCircleIcon,
  CogIcon,
  EnvelopeIcon,
  BoltIcon,
  ListBulletIcon,
  ArchiveBoxIcon,
  PaperClipIcon,
  ScaleIcon
} from '@heroicons/react/24/solid';
import { classNames } from '../utils/classNames';

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Refining', href: '/refining', icon: FunnelIcon },
  { name: 'Cooking', href: '/cooking', icon: CakeIcon },
  { name: 'Crafting', href: '/crafting-guide', icon: WrenchScrewdriverIcon },
  { name: 'Calculator', href: '/calculator/1', icon: CalculatorIcon },
  { name: 'Products', href: '/products/1', icon: ArchiveBoxIcon },
  { name: 'Technology', href: '/technology/1', icon: CogIcon },
  { name: 'Buildings', href: '/buildings/1', icon: HomeModernIcon },
  { name: 'Fish', href: '/fish/1', icon: ScaleIcon },
  { name: 'Curiosities', href: '/curiosities/1', icon: QuestionMarkCircleIcon },
  { name: 'Other', href: '/other/1', icon: PaperClipIcon },
  { name: 'Raw Materials', href: '/raw/1', icon: BoltIcon },
  { name: 'All Items', href: '/all-items/1', icon: ListBulletIcon },
  { name: 'Feedback', href: '/feedback', icon: EnvelopeIcon },
];

export default function Sidebar({ slug, layout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderNavItems = (mobile = false) => (
    <nav className={`mt-5 ${mobile ? 'space-y-1 px-2' : 'flex-1 space-y-1 bg-black px-2'}`}>
      {navigation.map((item) => (
        <a
          key={item.name}
          href={item.href}
          className={classNames(
            item.href.includes(slug)
              ? 'bg-blue-500 text-black'
              : 'text-white hover:bg-blue-500 hover:text-black',
            'group flex items-center px-2 py-1 text-lg font-medium rounded-md transition-colors'
          )}
        >
          <item.icon
            className={classNames(
              item.href.includes(slug)
                ? 'text-black'
                : 'text-gray-400 group-hover:text-black',
              'mr-3 flex-shrink-0 h-6 w-6 transition-colors'
            )}
            aria-hidden="true"
          />
          {item.name}
        </a>
      ))}
    </nav>
  );

  return (
    <>
      <div>
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-40 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
            </Transition.Child>

            <div className="fixed inset-0 z-40 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-black">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                      <button
                        type="button"
                        className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
                    <div className="flex flex-shrink-0 items-center px-4">
                      <img
                        className="h-[31px] w-auto"
                        src="/images/logo-nms.webp"
                        alt="No Man's Sky Recipes"
                      />
                    </div>
                    {renderNavItems(true)}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
              <div className="w-14 flex-shrink-0">
                {/* Force sidebar to shrink to fit close icon */}
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
          <div className="flex min-h-0 flex-1 flex-col bg-black">
            <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
              <div className="flex flex-shrink-0 items-center mb-2 px-4">
                <img
                  className="h-[31px] w-auto"
                  src="/images/logo-nms.webp"
                  alt="No Man's Sky Recipes"
                />
              </div>
              {renderNavItems()}
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col lg:pl-80">
          <div className="sticky top-0 z-10 bg-black p-3 text-right lg:hidden">
            <button
              type="button"
              className="-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center border rounded-md text-white hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <main className="flex-1">
            <div className="nms-bg mx-auto p-2 sm:px-6 lg:px-8 sm:py-6">
              {layout}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}