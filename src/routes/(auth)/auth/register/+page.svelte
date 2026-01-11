<script lang="ts">
	import type { ActionData } from "./$types";
	let { form } = $props<{ form: ActionData }>();
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">アカウント作成</h2>
			<p class="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
				または
				<a href="/auth/login" class="font-medium text-psan-green hover:text-psan-pink"> ログインする </a>
			</p>
		</div>
		<form class="mt-8 space-y-6" method="POST">
			<div class="space-y-4">
				<div>
					<label for="username" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ユーザー名</label>
					<input
						id="username"
						name="username"
						type="text"
						required
						class="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-psan-green focus:border-psan-green sm:text-sm bg-white dark:bg-slate-700"
						placeholder="ユーザー名"
					/>
				</div>
				<div>
					<label for="password" class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">パスワード</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						class="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-psan-green focus:border-psan-green sm:text-sm bg-white dark:bg-slate-700"
						placeholder="パスワード"
					/>
				</div>
			</div>

			{#if form?.message}
				<div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
					<p class="text-red-700 dark:text-red-300 text-sm text-center">{form.message}</p>
				</div>
			{/if}

			<div>
				<button
					type="submit"
					class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-psan-green hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-psan-green transition-all duration-300"
				>
					登録する
				</button>
			</div>
		</form>
	</div>
</div>
