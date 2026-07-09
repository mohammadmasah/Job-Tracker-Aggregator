export default function Login() {

    const input = "placeholder:text-text-3/50 w-full text-text/80 bg-emerald-900 border border-border-soft rounded-[4px] px-3 py-2 text-[12px] text-text placeholder-text-3 focus:outline-none focus:border-accent transition-colors font-mono";
    return (
        <div className="w-1/2 m-auto">
            <h1>Connection</h1>

            <form>
                <input
                    className={input}></input>
                <input
                    className={input}></input>

                <button
                    type="submit"
                    className={input}>CONNECTION</button>
            </form>
        </div>
    )
}