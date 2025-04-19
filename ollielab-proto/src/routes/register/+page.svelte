<script lang="ts">
	import type { ActionData } from './$types';

	export let form: ActionData;
</script>

<h1>Register</h1>

<form method="POST" action="?/register">
	<div>
		<label for="email">Email</label>
		<input type="email" id="email" name="email" required />
	</div>
	<div>
		<label for="password">Password</label>
		<input type="password" id="password" name="password" required minlength="6" />
	</div>
	{#if form?.error}
		<p style="color: red;">{form.error}</p>
	{/if}
	<button type="submit">Register</button>
</form>

<p>Already have an account? <a href="/login">Login</a></p>
