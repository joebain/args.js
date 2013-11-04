function makeWidget() {
	var args = Args([
					{title: Args.STRING | Args.NotNull},
					{description: Args.STRING | Args.Optional, _default: "Description missing"},
					{rating: Args.INT | Args. NotNull},
					{downloaded: Args.BOOL | Args.Optional}
	], arguments);

	var el = document.createElement("div");
	el.className = "app-box";
	if (args.downloaded === undefined) {
		el.className += " promotion";
	}

	var head = document.createElement("h2");
	head.textContent = args.title;
	var desc = document.createElement("p");
	desc.textContent = args.description;
	var rate = document.createElement("div");
	rate.className = "star-bar";
	for (var r = 0 ; r < args.rating ; r++) {
		var star = document.createElement("img");
		star.setAttribute("src", "star.png");
		rate.appendChild(star);
	}
	var down = document.createElement("div");
	down.textContent = "Downloaded?";
	var downBox = document.createElement("input");
	downBox.setAttribute("type", "checkbox");
	if (args.downloaded === undefined) {
		downBox.setAttribute("disabled", true);
	} else if (args.downloaded === true) {
		downBox.checked = true;
	}
	down.appendChild(downBox);

	el.appendChild(head);
	el.appendChild(desc);
	el.appendChild(rate);
	el.appendChild(down);

	return el;
}

function wrap() {
	Args
}

window.onload = function() {
	var list = document.getElementById("list");
	list.appendChild(makeWidget("Todo App", 3, false));
	list.appendChild(makeWidget("Information!", "Why not eat an apple?", 5));
	list.appendChild(makeWidget("Endless Runner Game", "Run forever, beat your high score.", 5, true));

}
