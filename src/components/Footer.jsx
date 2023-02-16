import { SITE } from '@config';
const navigation = {
    main: [
      { name: 'Refining', href: '/refining' },
      { name: 'Cooking', href: '/cooking' },
      { name: 'Crafting', href: '/crafting-guide' },
      { name: 'Calculator', href: '/calculator' },
      { name: 'Feedback', href: '/feedback' },
    ]
  }

  export default function Footer() {
    return (
      <footer className="bg-black flex flex-1 flex-col lg:pl-80">
        <div className="p-6 py-12 max-w-4xl mx-auto">
          <nav className="columns-2 sm:flex flex-wrap sm:justify-center sm:space-x-12" aria-label="Footer">
            {navigation.main.map((item) => (
              <div key={item.name} className="pb-6">
                <a href={item.href} className="text-sm leading-6 text-white hover:text-orange-500">
                  {item.name}
                </a>
              </div>
            ))}
          </nav>
          <p className="mt-8 text-center text-xs leading-5 text-gray-500">
            No Man's Sky Recipes | Updated to <a className='hover:text-orange-500' target="_blank" rel="noopener" href={SITE.version_link}>{SITE.version_name} {SITE.version}</a>
          </p>
        </div>
      </footer>
    )
  }
