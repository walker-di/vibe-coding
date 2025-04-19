<script lang="ts">
	import type * as Types from './$types';

	export let form: Types.ActionData;
</script>

<h1>Login</h1>

<form method="POST" action="?/login">
	<div>
		<label for="email">Email</label>
		<input type="email" id="email" name="email" required />
	</div>
	<div>
		<label for="password">Password</label>
		<input type="password" id="password" name="password" required />
	</div>
	{#if form?.error}
		<p style="color: red;">{form.error}</p>
	{/if}
	<button type="submit">Login</button>
</form>

<p>Don't have an account? <a href="/register">Register</a></p>
