import { Fragment, useState, type ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  CalculatorIcon,
  FunnelIcon,
  Squares2X2Icon,
  WrenchScrewdriverIcon,
  CakeIcon,
  BeakerIcon,
  XMarkIcon,
  HomeIcon,
  HomeModernIcon,
  QuestionMarkCircleIcon,
  CogIcon,
  EnvelopeIcon,
  BoltIcon,
  ArchiveBoxIcon,
  PaperClipIcon,
  ScaleIcon,
  PaperAirplaneIcon,
  WrenchIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/solid';
import type { ComponentType, SVGProps } from 'react';
import { classNames } from '../utils/classNames';

interface NavigationItem {
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface SidebarProps {
  slug?: string;
  layout?: ReactNode;
}

const navigation: NavigationItem[] = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Refining', href: '/refining', icon: FunnelIcon },
  { name: 'Cooking', href: '/cooking', icon: BeakerIcon },
  { name: 'Crafting', href: '/crafting-guide', icon: WrenchScrewdriverIcon },
  { name: 'Calculator', href: '/calculator', icon: CalculatorIcon },
  { name: 'Products', href: '/products', icon: ArchiveBoxIcon },
  { name: 'Technology', href: '/technology', icon: CogIcon },
  { name: 'Upgrades', href: '/upgrades', icon: WrenchIcon },
  { name: 'Exocraft', href: '/exocraft', icon: RocketLaunchIcon },
  { name: 'Starships', href: '/starships', icon: PaperAirplaneIcon },
  { name: 'Buildings', href: '/buildings', icon: HomeModernIcon },
  { name: 'Corvette', href: '/corvette', icon: PaperAirplaneIcon },
  { name: 'Fish', href: '/fish', icon: ScaleIcon },
  { name: 'Curiosities', href: '/curiosities', icon: QuestionMarkCircleIcon },
  { name: 'Other', href: '/other', icon: PaperClipIcon },
  { name: 'Food', href: '/food', icon: CakeIcon },
  { name: 'Raw Materials', href: '/raw', icon: BoltIcon },
  { name: 'All Items', href: '/items', icon: Squares2X2Icon },
  { name: 'Feedback', href: '/feedback', icon: EnvelopeIcon },
];

export default function Sidebar({ slug, layout }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderNavItems = (mobile = false) => (
    <nav className={`mt-3 ${mobile ? 'space-y-1 px-2' : 'flex-1 space-y-1 bg-black px-2'}`}>
      {navigation.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.name}
            href={item.href}
            className={classNames(
              slug && item.href.includes(slug)
                ? 'bg-blue-500 text-black'
                : 'text-white hover:bg-blue-500 hover:text-black',
              'group flex items-center px-2 py-1 text-base leading-tight font-medium rounded-md transition-colors'
            )}
          >
            <Icon
              className={classNames(
                slug && item.href.includes(slug)
                  ? 'text-black'
                  : 'text-gray-400 group-hover:text-black',
                'mr-2.5 flex-shrink-0 h-5 w-5 transition-colors'
              )}
              aria-hidden="true"
            />
            {item.name}
          </a>
        );
      })}
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
                    <a href="/" className="flex flex-shrink-0 items-center px-4">
                      <img
                        className="w-auto"
                        src="/images/logo-nms.webp"
                        alt="No Man's Sky Recipes"
                      />
                    </a>
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
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-56 lg:flex-col">
          <div className="flex min-h-0 flex-1 flex-col bg-black">
            <div className="flex flex-1 flex-col overflow-y-auto pt-3 pb-3">
              <a href="/" className="flex flex-shrink-0 items-center mb-1 px-3">
                <img
                  className="w-auto"
                  src="/images/logo-nms.webp"
                  alt="No Man's Sky Recipes"
                />
              </a>
              {renderNavItems()}
            </div>
          </div>
        </div>
        <div className="flex flex-1 flex-col lg:pl-56">
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
            <div className="nms-bg mx-auto">
              {layout}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
