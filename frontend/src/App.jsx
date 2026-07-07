import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <main className="min-h-screen bg-[#0b0f19] text-slate-200 flex items-center justify-center px-6">
        <section className="w-full max-w-xl rounded-xl border border-slate-800 bg-[#111827] p-8 shadow-2xl">
          <h1 className="mb-8 text-center text-5xl font-bold">
            Inscription
          </h1>

          <form className="space-y-7">
            <div>
              <label className="mb-2 block text-lg font-semibold text-slate-300">
                Nom
              </label>
              <input
                type="text"
                placeholder="Entrez votre nom"
                className="w-full rounded-lg border border-slate-600 bg-[#111827] px-4 py-3 text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>
          </form>
        </section>
      </main>
    </>
  )
}

export default App
