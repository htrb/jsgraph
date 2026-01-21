/*
 * Copyright (C) 2003-2006, Hiroyuki Ito. ZXB01226@nifty.com
 *
 * "JSGraph" is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published
 * by the Free Software Foundation; either version 2 of the License,
 * or (at your option) any later version.
 *
 * "JSGraph" is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307, USA.
 *
 */

/* $Id: jsgraph.js,v 1.71 2011/04/05 02:37:13 hito Exp $ */

/**********************************************************************
Global variables.
***********************************************************************/
let Is_mouse_down = false;
let Is_mouse_down_scale = false;
let Is_mouse_move_scale = false;
const Scale_region_size_min = 6;
let Mouse_x = 0;
let Mouse_y = 0;
let Mouse_client_x = 0;
let Mouse_client_y = 0;
let Mouse_position = 'C';
const Edge_width = 30;
let Font_size = 16; /* px */
let XMLHttp = null; // for backward compatibility

/**********************************************************************
Utility functions
***********************************************************************/
const create_http_request = function () {
  let xmlhttp = false;

  if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
    xmlhttp = new XMLHttpRequest();
    xmlhttp.overrideMimeType("text/plain");
  }
  return xmlhttp;
}

XMLHttp = create_http_request();

Math.log10 = function(x) {
  return this.log(x) / this.LN10;
}

Date.prototype.getMJD = function () {
  return 40587 + this.getTime()/86400000;
}

Date.prototype.setMJD = function (mjd) {
  this.setTime((mjd - 40587) * 86400000);
}

Date.prototype.getUnix = function () {
  return this.getTime() / 1000;
}

Date.prototype.setUnix = function (unix) {
  this.setTime(unix * 1000);
}

Date.prototype.set_ymd = function (y, m, d) {
  if (y) {
    this.setUTCFullYear(y);
  }
  if (m) {
    // CAUTION!!  m = 1..12 because following code does not run when m == 0.
    this.setUTCMonth(m - 1);
  }
  if (d) {
    this.setUTCDate(d);
  }
  this.setUTCHours(0);
  this.setUTCMinutes(0);
  this.setUTCSeconds(0);
  //  this.setMilliSeconds(0);
}

Date.prototype.nextMonth = function () {
  let m = this.getUTCMonth(), y = this.getUTCFullYear();

  if (m == 11) {
    y++;
    m = 0;
  } else {
    m++;
  }

  this.setUTCMonth(m);
  this.setUTCFullYear(y);
}

Date.prototype.nextDate = function (...args) {
  const t = this.getTime();
  let mul = 1;

  if (args.length > 0) {
    mul = args[0];
  }
  this.setTime(t + 86400000 * mul);
}

Date.prototype.nextHour = function (...args) {
  const t = this.getTime();
  let mul = 1;

  if (args.length > 0) {
    mul = args[0];
  }
  this.setTime(t + 3600000 * mul);
}

/**********************************************************************
Event Handlers.
***********************************************************************/
function change_curser (node, x, y) {
  const width  = parseInt(node.style.width, 10);
  const height = parseInt(node.style.height, 10);
  if (node.frame) {
    node = node.frame;
  }

  if (x >= Edge_width && width - x >= Edge_width &&
      y >= Edge_width && height - y >= Edge_width) {
    node.style.cursor = 'move';
    return;
  } else if (y < Edge_width) {
    if (x < Edge_width) {
      node.style.cursor = 'nw-resize';
    } else if (width - x < Edge_width) {
      node.style.cursor = 'ne-resize';
    } else {
      node.style.cursor = 'n-resize';
    }
  } else if (height - y < Edge_width) {
    if (x < Edge_width) {
      node.style.cursor = 'sw-resize';
    } else if (width - x < Edge_width) {
      node.style.cursor = 'se-resize';
    } else {
      node.style.cursor = 's-resize';
    }
  } else if (x < Edge_width) {
    node.style.cursor = 'w-resize';
  } else if (width - x < Edge_width) {
    node.style.cursor = 'e-resize';
  }
}

function resize_move (node, x, y) {
  const width  = parseInt(node.style.width, 10);
  const height = parseInt(node.style.height, 10);
  const left   = parseInt(node.style.left, 10);
  const top    = parseInt(node.style.top, 10);

  switch (Mouse_position) {
  case 'NW':
    node.style.left = `${left + x}px`;
    node.style.top = `${top + y}px`;
    node.style.width = `${width - x}px`;
    node.style.height = `${height - y}px`;
    break;
  case 'NE':
    node.style.top = `${top + y}px`;
    node.style.width = `${width + x}px`;
    node.style.height = `${height - y}px`;
    break;
  case 'SE':
    node.style.width = `${width + x}px`;
    node.style.height = `${height + y}px`;
    break;
  case 'SW':
    node.style.left = `${left + x}px`;
    node.style.width = `${width - x}px`;
    node.style.height = `${height + y}px`;
    break;
  case 'N':
    node.style.top = `${top + y}px`;
    node.style.height = `${height - y}px`;
    break;
  case 'E':
    node.style.width = `${width + x}px`;
    break;
  case 'S':
    node.style.height = `${height + y}px`;
    break;
  case 'W':
    node.style.left = `${left + x}px`;
    node.style.width = `${width - x}px`;
    break;
  default:
    node.style.left = `${left + x}px`;
    node.style.top = `${top + y}px`;
  }
}

function move (node, x, y) {
  const left = parseInt(node.style.left, 10);
  const top  = parseInt(node.style.top, 10);

  node.style.left  = `${left + x}px`;
  node.style.top = `${top + y}px`;
  node.offset_x += x;
  node.offset_y += y;
}

function mouse_resize_move_dom (e) {
  if (Is_mouse_down) {
    resize_move(this, e.clientX - Mouse_x, e.clientY - Mouse_y);
    Mouse_x = e.clientX;
    Mouse_y = e.clientY;
    if (this.frame) {
      if (this.firstChild) {
        while (this.firstChild) {
          this.removeChild(this.firstChild);
        }
      }
      this.graph.update_position();
    }

    return;
  }

  if (e.currentTarget == e.target && this.parent_frame) {
    change_curser(this, e.layerX, e.layerY);
  }
}

function mouse_move_dom (e) {
  if (Is_mouse_down) {
    move(this, e.clientX - Mouse_x, e.clientY - Mouse_y);
    Mouse_x = e.clientX;
    Mouse_y = e.clientY;
    if (this.moved) {
      this.moved();
    }
  }
}

function mouse_down_dom (e) {
  const x = e.layerX;
  const y = e.layerY;
  const width  = parseInt(this.style.width, 10);
  const height = parseInt(this.style.height, 10);

  if (e.button != 0) {
    return;
  }

  Mouse_x = e.clientX;
  Mouse_y = e.clientY;
  if (x < Edge_width && y < Edge_width) {
    Mouse_position = 'NW';
  } else if (width - x < Edge_width && y < Edge_width) {
    Mouse_position = 'NE';
  } else if (width - x < Edge_width && height - y < Edge_width) {
    Mouse_position = 'SE';
  } else if (x < Edge_width && height - y < Edge_width) {
    Mouse_position = 'SW';
  } else if (y < Edge_width) {
    Mouse_position = 'N';
  } else if (width - x < Edge_width) {
    Mouse_position = 'E';
  } else if (height - y < Edge_width) {
    Mouse_position = 'S';
  } else if (x < Edge_width) {
    Mouse_position = 'W';
  } else {
    Mouse_position = "C";
  }

  Is_mouse_down = true;
}

function mouse_up_dom () {
  if (this.graph && Is_mouse_down) {
    if (!this.firstChild) {
      this.appendChild(this.frame);
      this.appendChild(this.frame.scale_div);
    }
    if (Mouse_position != 0) {
      this.graph.clear();
      this.graph.draw();
    } else {
      this.graph.update_position();
      this.graph.draw();
    }
  }
  Is_mouse_down = false;
}

function mouse_over_dom () {
  this.style.cursor='move';
}

function mouse_down_scale_dom (e) {
  const x = e.layerX;
  const y = e.layerY;
  if (e.button != 0) {
    return;
  }

  if (! this.scale_div) {
    return false;
  }

  Mouse_x = x;
  Mouse_y = y;

  Mouse_client_x = e.clientX;
  Mouse_client_y = e.clientY;

  Is_mouse_down_scale = true;
}

function mouse_up_scale_dom () {
  let scale;

  if (this.scale_div) {
    scale = this.scale_div;
  } else if (this.graph) {
    scale = this;
  } else {
    Is_mouse_down_scale = false;
    Is_mouse_move_scale = false;
    return false;
  }
  if (Is_mouse_down_scale) {
    if (Is_mouse_move_scale) {
      const x = parseInt(scale.style.left, 10);
      const y = parseInt(scale.style.top, 10);
      const w = parseInt(scale.style.width, 10);
      const h = parseInt(scale.style.height, 10);
      if (w > Scale_region_size_min && h > Scale_region_size_min) {
        scale.graph.set_scale(scale.graph.get_data_x(x),
                              scale.graph.get_data_y(y),
                              scale.graph.get_data_x(x + w),
                              scale.graph.get_data_y(y + h));
      }
    } else {
      const x = scale.graph.get_data_x(Mouse_x);
      const y = scale.graph.get_data_y(Mouse_y);
      scale.graph.centering(x, y);
    }
  }
  Is_mouse_down_scale = false;
  Is_mouse_move_scale = false;
  scale.graph.draw();
  scale.style.visibility = 'hidden';
  scale.style.left = '0px';
  scale.style.top  = '0px';
  scale.style.width = '0px';
  scale.style.height = '0px';
}

function mouse_move_scale_dom (e) {
  let x, y;
  x = e.layerX;
  y = e.layerY;

  if (Is_mouse_down_scale) {
    let w, h, scale;

    Is_mouse_move_scale = true;
    if (this.scale_div) {
      scale = this.scale_div;
      w = Math.abs(Mouse_x - x);
      h = Math.abs(Mouse_y - y);
      x = Math.min(Mouse_x, x);
      y = Math.min(Mouse_y, y);
      scale.style.left = `${x}px`;
      scale.style.top  = `${y}px`;
    } else if (this.graph) {
      scale = this;
      w = x;
      h = y;
      if (Mouse_client_x > e.clientX) {
        x = parseInt(scale.style.left, 10) + w;
        w = parseInt(scale.style.width, 10) - w;
        x--;
        scale.style.left = `${x}px`;
      }
      if (Mouse_client_y > e.clientY) {
        y = parseInt(scale.style.top, 10) + h;
        h = parseInt(scale.style.height, 10) - h;
        y--;
        scale.style.top = `${y}px`;
      }
      w++;
      h++;
    } else {
      return false;
    }
    scale.style.visibility = 'visible';
    scale.style.width = `${w}px`;
    scale.style.height = `${h}px`;
  }
}

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const frame = entry.target;
    if (frame.graph) {
      frame.graph.update_position();
      frame.graph.draw();
    }
  }
});

/**********************************************************************
Definition of Text Object.
***********************************************************************/

function GraphText(...args) {
  const text = document.createElement('span');

  text.style.position = 'absolute';
  text.style.fontSize = `${Font_size}px`;
  text.style.whiteSpace = 'nowrap';
  if (args.length > 0) {
    text.innerHTML = args[0];
  }
  this.text = text;
}

GraphText.prototype = {
  init (node, x, y) {
    this.text.style.left = `${x}px`;
    this.text.style.top = `${y}px`;

    node.appendChild(this.text);
  },

  set_text (s) {
    if (s == null) {
      this.text.style.visibility = 'hidden';
    } else {
      this.text.innerHTML = String(s);
      this.text.style.visibility = 'visible';
    }
  },

  get_text () {
    if (this.text.style.visibility == 'hidden') {
      return null;
    } else {
      return this.text.innerHTML;
    }
  },

  size (size) {
    this.text.style.fontSize = `${size}px`;
  },

  x (x) {
    this.text.style.left = `${x}px`;
  },

  y (y) {
    this.text.style.top = `${y}px`;
  },

  offset_x (x) {
    this.text.offset_x = x;
  },

  offset_y (y) {
    this.text.offset_y = y;
  },

  get_width () {
    return this.text.clientWidth;
  },

  get_height () {
    return this.text.clientHeight;
  },

  get_x () {
    return this.text.offsetLeft;
  },

  get_y () {
    return this.text.offsetTop;
  }
};

/**********************************************************************
Definition of Caption Object.
***********************************************************************/
function Caption(s) {
  const text = document.createElement('span');

  text.style.position = 'absolute';
  text.style.whiteSpace = 'nowrap';
  text.style.fontSize = `${Font_size}px`;
  text.appendChild(document.createTextNode(s));

  text.addEventListener("mousemove", mouse_move_dom, true);
  text.addEventListener("mousedown", mouse_down_dom, true);
  text.addEventListener("mouseup",   mouse_up_dom, true);
  text.addEventListener("mouseout",  mouse_up_dom, true);
  text.addEventListener("mouseover", mouse_over_dom, true);

  text.offset_x = 0;
  text.offset_y = 0;
  this.text = text;

  this.moved = false;
  text.obj = this;
  text.moved = function () {
    this.obj.moved = true;
  }
}

Caption.prototype = new GraphText("");

/**********************************************************************
Definition of JSGraph Object.
***********************************************************************/
function JSGraph(...args) {
  if (args.length > 0) {
    this.init(args[0]);
  }
  this.Colors = [
    '#9900cc',
    '#669900',
    '#6699cc',
    '#ff99ff',
    '#cccc99',
    '#999999',
    '#ffcc00',
    '#ffffcc',
    '#ccffff',
    '#ffccff',
    '#003366',
    '#990066',
    '#993300',
    '#669900',
    '#6699cc',
    '#0066cc'
  ];
  this.Style = "lc";
  this.X = 1;
  this.Y = 2;
  this.FS = /[ ,\t]+/
  this.RS = "\n";
}

JSGraph.prototype = {
  init(id) {
    const parent_frame = document.createElement('div');
    const legend    = document.createElement('table');
    const scale_x   = document.createElement('div');
    const scale_y   = document.createElement('div');
    const scale_div = document.createElement('div');
    const graph     = document.getElementById(id);
    const frame     = this.create_canvas();
    const position_cookie = `${id}_position`;
    const offset_x = 140;
    const offset_y = 60;
    const margin_x = 200;
    const margin_y = 80;

    this.SCALE_TYPE_LINEAR = 0;
    this.SCALE_TYPE_LOG    = 1;
    this.SCALE_TYPE_UNIX   = 2;
    this.SCALE_TYPE_MJD    = 3;

    this.graph = graph;
    this.position_cookie = position_cookie;

    document.addEventListener('keydown', this.event_key_down.bind(this));
    document.addEventListener('keyup', this.event_key_up.bind(this));

    this.offset_x = offset_x;
    this.offset_y = offset_y;
    this.margin_x = margin_x;
    this.margin_y = margin_y;
    const w = parseInt(graph.style.width, 10) - offset_x - margin_x;
    const h = parseInt(graph.style.height, 10) - offset_y - margin_y;

    graph.style.position = 'relative';

    parent_frame.style.position = 'absolute';
    parent_frame.style.overflow = 'hidden';
    parent_frame.style.backgroundColor = '#c0c0c0';
    parent_frame.style.top = `${offset_y}px`;
    parent_frame.style.left = `${offset_x}px`;
    parent_frame.style.width = `${w}px`;
    parent_frame.style.height = `${h}px`;
    parent_frame.style.borderColor = '#000000';
    parent_frame.style.borderWidth = '3px';
    parent_frame.style.borderStyle = 'ridge';
    parent_frame.graph = this;

    graph.appendChild(parent_frame);
    this.parent_frame = parent_frame;

    //  frame.style.position = 'absolute';
    frame.style.overflow = 'hidden';
    frame.style.backgroundColor = '#c0c0c0';
    frame.style.top = '0px';
    frame.style.left = '0px';
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    frame.width = w;
    frame.height = h;
    frame.style.borderColor = '#FF0000';
    frame.style.borderWidth = '1px';
    frame.style.borderStyle = 'none';

    frame.gauge = new Object();
    frame.gauge.width = '1';
    frame.gauge.length = '5';
    frame.gauge.color = '#000000';
    frame.graph = this;
    frame.parent_frame = parent_frame;
    frame.scale_div = scale_div;

    scale_div.style.position = 'absolute';
    scale_div.style.borderColor = '#000000';
    scale_div.style.borderWidth = '1px';
    scale_div.style.borderStyle = 'dotted';
    scale_div.style.visibility = 'hidden';
    scale_div.style.width = '100px';
    scale_div.style.height = '100px';
    scale_div.style.left = '0px';
    scale_div.style.top = '0px';
    scale_div.style.margin = '0px';
    scale_div.addEventListener("mouseup",   mouse_up_scale_dom, true);
    scale_div.addEventListener("mousemove", mouse_move_scale_dom, true);
    scale_div.graph = this;

    this.frame = frame;
    this.canvas = frame.getContext('2d');
    this.canvas.lineCap  = "round";
    this.canvas.lineJoin = "round";
    parent_frame.frame = frame;
    parent_frame.appendChild(frame);
    parent_frame.appendChild(scale_div);

    legend.style.position = 'absolute';
    legend.style.backgroundColor = '#c0c0c0';
    legend.style.borderColor = '#000000';
    legend.style.borderWidth = '3px';
    legend.style.borderStyle = 'ridge';
    legend.offset_x = 40;
    legend.offset_y = 0;

    legend.addEventListener("mousemove", mouse_move_dom, true);
    legend.addEventListener("mousedown", mouse_down_dom, true);
    legend.addEventListener("mouseup",   mouse_up_dom, true);
    legend.addEventListener("mouseout",  mouse_up_dom, true);
    legend.addEventListener("mouseover", mouse_over_dom, true);

    graph.appendChild(legend);
    this.legend = legend;

    this.title = new Caption("Graph");
    this.title.init(graph, 0, 0);
    this.title.text.offset_x = parseInt(frame.style.width, 10) / 2 - 25;
    this.title.text.offset_y = -25;

    this.caption_y = new Caption("Y-Axis");
    this.caption_y.init(graph, 0, 0);
    this.caption_y.text.offset_x = -100;
    this.caption_y.text.offset_y = (parseInt(frame.style.height, 10) - Font_size) / 2;

    this.caption_x = new Caption("X-Axis");
    this.caption_x.init(graph, 0, 0);
    this.caption_x.text.offset_x = parseInt(frame.style.width, 10) / 2 - 25;
    this.caption_x.text.offset_y = 40;

    scale_x.style.position = 'absolute';
    scale_x.style.overflow = 'visible';
    scale_x.style.backgroundColor = '#c0c0c0';
    scale_x.offset = 5;
    scale_x.graph = this;
    scale_x.type = this.SCALE_TYPE_LINEAR;
    this.scale_x = scale_x;
    graph.appendChild(scale_x);

    scale_y.style.position = 'absolute';
    scale_y.style.overflow = 'visible';
    scale_y.style.backgroundColor = '#c0c0c0';
    scale_y.offset = -2;
    scale_y.graph = this;
    scale_y.type = this.SCALE_TYPE_LINEAR;
    this.scale_y = scale_y;
    graph.appendChild(scale_y);

    this.min_x = 0;
    this.max_x = 10;
    this.min_y = -53000;
    this.max_y = -50000;

    this.zoom_ratio = 1.4;

    this.data = new Array(0);
    this.scale_mode();
    this.restore_position();
    this.update_position();
  },

  event_key_down(e) {
    if (e.keyCode == 17) {
      this.resize_mode();
    }
  },

  event_key_up(e) {
    if (e.keyCode == 17) {
      mouse_up_dom.call(this.parent_frame);
      this.scale_mode();
    }
  },

  create_canvas() {
    return document.createElement('canvas');
  },

  resize_mode () {
    this.frame.style.cursor='move';
    this.parent_frame.addEventListener("mousemove", mouse_resize_move_dom, true);
    this.parent_frame.addEventListener("mousedown", mouse_down_dom, true);
    this.parent_frame.addEventListener("mouseup",   mouse_up_dom, true);
    this.parent_frame.addEventListener("mouseout",  mouse_up_dom, true);

    this.frame.addEventListener("mousemove", mouse_resize_move_dom, true);
    this.frame.removeEventListener("mousedown", mouse_down_scale_dom, true);
    this.frame.removeEventListener("mouseup",   mouse_up_scale_dom, true);
    this.frame.removeEventListener("mousemove", mouse_move_scale_dom, true);
  },

  scale_mode () {
    this.frame.style.cursor='default';
    this.parent_frame.removeEventListener("mousemove", mouse_resize_move_dom, true);
    this.parent_frame.removeEventListener("mousedown", mouse_down_dom, true);
    this.parent_frame.removeEventListener("mouseup",   mouse_up_dom, true);
    this.parent_frame.removeEventListener("mouseout",  mouse_up_dom, true);

    this.frame.removeEventListener("mousemove", mouse_resize_move_dom, true);
    this.frame.addEventListener("mousedown", mouse_down_scale_dom, true);
    this.frame.addEventListener("mouseup",   mouse_up_scale_dom, true);
    this.frame.addEventListener("mousemove", mouse_move_scale_dom, true);
  },

  set_color (color) {
    this.legend.style.backgroundColor = color;
    this.frame.style.backgroundColor = color;
  },

  set_border_color (color) {
    this.legend.style.borderColor = color;
    this.frame.style.borderColor = color;
  },

  add_legend (str, color) {
    const table = this.legend;
    const row = table.rows.length;

    if (str == null) {
      return;
    }

    table.insertRow(row);
    table.rows[row].insertCell(0);
    table.rows[row].cells[0].style.color = color;
    table.rows[row].cells[0].style.whiteSpace = 'nowrap';
    table.rows[row].cells[0].appendChild(document.createTextNode(str));
  },

  autoscale () {
    const data = this.data;
    const minmax = {
      minx: Infinity,
      maxx: -Infinity,
      miny: Infinity,
      maxy: -Infinity,
    };

    if (data.length < 1) {
      return;
    }

    data.reduce((mm, element) => {
      element.autoscale();

      if (! element.draw) {
        return mm;
      }

      if (element.min_x < mm.minx) {
        mm.minx = element.min_x;
      }
      if (element.max_x > mm.maxx) {
        mm.maxx = element.max_x
      }

      if (element.min_y < mm.miny) {
        mm.miny = element.min_y;
      }
      if (element.max_y > mm.maxy) {
        mm.maxy = element.max_y
      }
      return mm;
    }, minmax);

    if (! isFinite(minmax.minx) || ! isFinite(minmax.maxx) || ! isFinite(minmax.miny) || ! isFinite(minmax.maxy)) {
      return;
    }

    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      this.min_x = minmax.minx * 0.9;
      this.max_x = minmax.maxx * 1.1;
    } else {
      if (minmax.maxx - minmax.minx < 1E-15) {
        minmax.minx -= Math.abs(minmax.minx) * 0.1;
        minmax.maxx += Math.abs(minmax.maxx) * 0.1;
      }
      this.min_x = minmax.minx - (minmax.maxx - minmax.minx) * 0.05;
      this.max_x = minmax.maxx + (minmax.maxx - minmax.minx) * 0.05;
    }
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      this.min_y = minmax.miny * 0.9;
      this.max_y = minmax.maxy * 1.1;
    } else {
      if (minmax.maxy - minmax.miny < 1E-15) {
        minmax.miny -= Math.abs(minmax.miny) * 0.1;
        minmax.maxy += Math.abs(minmax.maxy) * 0.1;
      }
      this.min_y = minmax.miny - (minmax.maxy - minmax.miny) * 0.05;
      this.max_y = minmax.maxy + (minmax.maxy - minmax.miny) * 0.05;
    }
  },

  draw_each_data_l (data) {
    const canvas = this.canvas;

    canvas.save();

    canvas.strokeStyle = data.color;
    canvas.lineWidth = data.width;
    canvas.lineJoin = "round";
    canvas.beginPath();

    const d = data.data;
    const d0 = d.shift();
    canvas.moveTo(this.get_x(d0[0]), this.get_y(d0[1]));
    data.forEach(di => canvas.lineTo(this.get_x(di[0]), this.get_y(di[1])));
    d.unshift(d0);
    canvas.stroke();
    canvas.restore();
  },

  draw_each_data_c (data) {
    const s = data.size / 2.0;
    const c = data.color;
    data.data.forEach(di => this.fill_circle(this.get_x(di[0]), this.get_y(di[1]), s, c));
  },

  draw_each_data_r (data) {
    const s1 = data.size;
    const s2 = s1 / 2.0;
    const c = data.color;
    data.data.forEach(di => this.fill_rectangle(this.get_x(di[0]) - s2,
                                                this.get_y(di[1]) - s2,
                                                s1, s1, c));
  },

  draw_data () {
    this.data.forEach(element => {
      if (element.draw && element.length() > 0) {
        switch (element.style) {
        case "c":
          this.draw_each_data_c(element);
          break;
        case "l":
          this.draw_each_data_l(element);
          break;
        case "lc":
          this.draw_each_data_l(element);
          this.draw_each_data_c(element);
          break;
        case "lr":
          this.draw_each_data_l(element);
          this.draw_each_data_r(element);
          break;
        default:
          this.draw_each_data_r(element);
        }
        this.add_legend(element.caption, element.color);
      }
    });
  },

  add_data (data) {
    this.data.push(data);
  },

  fill_rectangle (x, y, width, height, color) {
    if (!isFinite(x) || !isFinite(y)) {
      return;
    }

    if (this.frame) {
      const canvas = this.canvas;
      canvas.fillStyle = color;
      canvas.fillRect (x, y, width, height);
    }
  },


  fill_circle (x, y, r, color) {
    if (!isFinite(x) || !isFinite(y)) {
      return;
    }

    if (this.frame) {
      const canvas = this.canvas;
      canvas.save();

      canvas.fillStyle = color;
      canvas.beginPath();
      canvas.arc(x, y, r, 0, 360, false);
      canvas.fill();

      canvas.restore();
    }
  },

  line (x1, y1, x2, y2, color) {
    const canvas = this.canvas;

    canvas.save();

    canvas.strokeStyle = color;
    canvas.beginPath();
    canvas.lineWidth = 1.0;
    canvas.moveTo(x1, y1);
    canvas.lineTo(x2, y2);
    canvas.stroke();

    canvas.restore();
  },

  create_gauge_x (x, y, len) {
    this.line(x, y, x, y + len, '#000000');
  },

  create_gauge_y (x, y, len) {
    this.line(x, y, x + len, y, '#000000');
  },

  draw_gauge1_x (x) {
    this.create_gauge_x(x, 0, this.frame.height);
  },

  draw_gauge1_y (y) {
    this.create_gauge_y(0, y, this.frame.width);
  },

  draw_gauge2_x (x) {
    const frame = this.frame;
    const len = frame.gauge.length * 2;

    this.create_gauge_x(x, 0, len);
    const y = parseInt(frame.style.height, 10) - len;
    this.create_gauge_x(x, y, len);
  },

  draw_gauge2_y (y) {
    const frame = this.frame;
    const len = frame.gauge.length * 2;

    this.create_gauge_y(0, y, len);
    const x = parseInt(frame.style.width, 10) - len;
    this.create_gauge_y(x, y, len);
  },

  draw_gauge3_x (x) {
    const frame = this.frame;
    const len = frame.gauge.length;

    this.create_gauge_x(x, 0, len);
    const y = parseInt(frame.style.height, 10) - len;
    this.create_gauge_x(x, y, len);
  },

  draw_gauge3_y (y) {
    const frame = this.frame;
    const len = frame.gauge.length;

    this.create_gauge_y(0, y, len);
    const x = parseInt(frame.style.width, 10) - len;
    this.create_gauge_y(x, y, len);
  },

  gauge_x () {
    let inc, d, j, start, l, n, m, diff;
    let str, text;
    const frame = this.frame;
    const width = parseInt(frame.style.width, 10);

    if (this.min_x == this.max_x) {
      this.min_x -= 1;
      this.max_x += 1;
    } else if (this.min_x > this.max_x) {
      d = this.min_x;
      this.min_x = this.max_x;
      this.max_x = d;
    }

    m = Math.ceil(Math.log10(this.max_x - this.min_x));
    inc = Math.pow(10, m - 1);

    if ((this.max_x - this.min_x) / inc < 2) {
      inc /= 5;
      diff = 2;
    } else {
      diff = 1;
    }

    start = Math.ceil(this.min_x / inc);
    str = Math.abs(start * diff).toFixed(0);
    const len = str.length;

    m = this.max_x / inc;
    for (j = start; j <= m; j++) {
      str = (j * diff).toFixed(0);
      l = str.length;
      const decpt = 1 + (l - len);

      if (l > decpt) {
        str = `${str.substring(0, decpt)}.${str.substring(decpt, l)}`;
      }
      n = this.get_x(j * inc);
      text = new GraphText(String(str));
      text.init(this.scale_x, n, this.scale_x.offset);
      text.x(n - text.get_width() / 2);
    }

    m = Math.floor(Math.log10(inc * (0.5 + Math.abs((start == 0)? 1: start))) * (1 + 2E-16));
    // "1 + 2E-16" exist for underflow

    if (m != 0) {
      text = new GraphText(`&times;10<sup>${m}</sup>`);
      text.init(this.scale_x, width, this.scale_x.offset + Font_size);
    }

    for (m = 1, d = start - 0.1; m < 10; m++, d -= 0.1) {
      n = this.get_x(d * inc);
      if (m == 5) {
        this.draw_gauge2_x(n);
      } else {
        this.draw_gauge3_x(n);
      }
    }

    for (; start <= this.max_x / inc; start++) {
      n = this.get_x(start * inc);
      this.draw_gauge1_x(n);
      for (m = 1, d = start + 0.1; m < 10; m++, d += 0.1) {
        n = this.get_x(d * inc);
        if (m == 5) {
          this.draw_gauge2_x(n);
        } else {
          this.draw_gauge3_x(n);
        }
      }
    }
  },

  gauge_date_x () {
    let d, inc = 0, style, len, n, m, date_conv, str, text, i, j;
    const min_date = new Date(), date = new Date(), max_date = new Date();

    if (this.min_x == this.max_x) {
      this.min_x -= 1;
      this.max_x += 1;
    } else if (this.min_x > this.max_x) {
      d = this.min_x;
      this.min_x = this.max_x;
      this.max_x = d;
    }

    switch (this.scale_x.type) {
    case this.SCALE_TYPE_UNIX:
      date_conv = 86400;
      date.setUnix(this.min_x);
      min_date.setUnix(this.min_x);
      max_date.setUnix(this.max_x);
      break;
    case this.SCALE_TYPE_MJD:
      date_conv = 1;
      date.setMJD(this.min_x);
      min_date.setMJD(this.min_x);
      max_date.setMJD(this.max_x);
      break;
    }

    const span = (this.max_x - this.min_x) / date_conv;
    if (span > 4000) {
      const min = this.min_x;
      const max = this.max_x;

      switch (this.scale_x.type) {
      case this.SCALE_TYPE_UNIX:
        min_date.setUnix(this.min_x);
        max_date.setUnix(this.max_x);
        break;
      case this.SCALE_TYPE_MJD:
        min_date.setMJD(this.min_x);
        max_date.setMJD(this.max_x);
        break;
      }
      this.min_x = 1970 + min_date.getTime() / (365.2425 * 24 * 60 * 60 * 1000);
      this.max_x = 1970 + max_date.getTime() / (365.2425 * 24 * 60 * 60 * 1000);

      this.gauge_x();

      this.min_x = min;
      this.max_x = max;

      return;
    } else if (span > 400) {
      style = "year";
      date.set_ymd(false, 1, 1);
    } else if (span > 60) {
      style = "month";
      date.set_ymd(false, false, 1);
    } else if (span > 1) {
      style = "day";
      d = date.getUTCDate();
      if (span > 20) {
        inc = 4;
        d = Math.floor((d - 1) / inc) * inc + 1;
      } else if (span > 12) {
        inc = 2;
        d = Math.floor((d - 1) / inc) * inc + 1;
      } else {
        inc = 1;
      }
      date.set_ymd(false, false, d);
    } else {
      style = "hour";
      if (span > 0.5) {
        inc = 2;
      } else {
        inc = 1;
      }
      date.set_ymd(false, false, d);
    }

    while (date.getTime() < max_date.getTime()) {
      switch (this.scale_x.type) {
      case this.SCALE_TYPE_UNIX:
        d = date.getUnix();
        break;
      case this.SCALE_TYPE_MJD:
        d = date.getMJD();
        break;
      }

      n = this.get_x(d);

      switch (style) {
      case "year":
        if (date.getUTCMonth() == 0) {
          if (d < this.min_x) {
            break;
          }
          this.draw_gauge1_x(n);
          text = new GraphText(String(date.getUTCFullYear()));
          text.init(this.scale_x, n - 3 * Font_size / 4, this.scale_x.offset);
        } else {
          this.draw_gauge3_x(n);
        }
        break;
      case "month":
        if (date.getUTCDate() == 1) {
          if (d < this.min_x) {
            break;
          }
          this.draw_gauge1_x(n);
          if (date.getUTCMonth() == 0) {
            str = `${date.getUTCFullYear()}/1`;
            len = 6;
          } else {
            str = String(date.getUTCMonth() + 1);
            len = str.length;
          }
          if (d > this.min_x) {
            text = new GraphText((str));
            text.init(this.scale_x, n - (len - 1) * Font_size / 4, this.scale_x.offset);
          }
        } else {
          this.draw_gauge3_x(n);
        }
        break;
      case "day":
        if (date.getUTCMonth() == 0 && date.getUTCDate() == 1) {
          str = `1/1<br>${date.getUTCFullYear()}`;
          len = 3;
        } else if (date.getUTCDate() == 1) {
          str = `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
          len = str.length;
        } else {
          str = String(date.getUTCDate());
          len = str.length;
        }
        if (d > this.min_x && (inc != 4 || date.getUTCDate() < 28)) {
          text = new GraphText((str));
          text.init(this.scale_x, n - (len - 1) * Font_size / 4, this.scale_x.offset);
          this.draw_gauge1_x(n);
        } else {
          this.draw_gauge2_x(n);
        }
        for (i = 3 * inc; i < 24 * inc; i += 3 * inc) {
          switch (this.scale_x.type) {
          case this.SCALE_TYPE_UNIX:
            n = this.get_x(d + 60 * 60 * i);
            break;
          case this.SCALE_TYPE_MJD:
            n = this.get_x(d + i / 24.0);
            break;
          }
          if (i % 24 == 0 || inc == 1 && i % 12 == 0) {
            this.draw_gauge2_x(n);
          } else {
            this.draw_gauge3_x(n);
          }
        }
        break;
      case "hour": {
        let h = date.getUTCHours();
        for (i = 0; i < inc; i++, h++) {
          if (inc == 1 || h % 2 == 0) {
            this.draw_gauge1_x(n);
            if (d > this.min_x) {
              if (h == 0) {
                str = `0<br>${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
                len = 1;
              } else {
                str = String(h);
                len = str.length;
              }
              text = new GraphText(str);
              text.init(this.scale_x, n - (len - 1) * Font_size / 4, this.scale_x.offset);
            }
          }
          if (inc == 2) {
            for (j = 0; j < 2; j++) {
              switch (this.scale_x.type) {
              case this.SCALE_TYPE_UNIX:
                d += 30 * 60;
                n = this.get_x(d);
                break;
              case this.SCALE_TYPE_MJD:
                d += 1 / 48.0;
                n = this.get_x(d);
                break;
              }
              if (j == 0) {
                this.draw_gauge3_x(n);
              } else {
                this.draw_gauge2_x(n);
              }
            }
          } else if (inc == 1) {
            for (j = 0; j < 6; j++) {
              switch (this.scale_x.type) {
              case this.SCALE_TYPE_UNIX:
                d +=  10 * 60;
                n = this.get_x(d);
                break;
              case this.SCALE_TYPE_MJD:
                d += 1 / 24.0 / 6;
                n = this.get_x(d);
                break;
              }
              if (j == 2) {
                this.draw_gauge2_x(n);
              } else {
                this.draw_gauge3_x(n);
              }
            }
          }
        }
      }
        break;
      }
      switch (style) {
      case "year":
        date.nextMonth();
        break;
      case "month":
        switch (date.getUTCDate()) {
        case 1:
          date.set_ymd(false, false, 10);
          break;
        case 10:
          date.set_ymd(false, false, 20);
          break;
        case 20:
          date.nextMonth();
          date.setUTCDate(1);
          break;
        }
        //        l += date.getUTCFullYear() + " ";
        break;
      case "day":
        m = date.getUTCMonth();
        date.nextDate(inc);
        if (m != date.getUTCMonth()) {
          date.setUTCDate(1);
        }
        break;
      case "hour":
        date.nextHour(inc);
        break;
      default:
        date.nextDate();
        break;
      }
    }

    switch (style) {
    case "year":
      break;
    case "month":
      if (min_date.getUTCFullYear() != max_date.getUTCFullYear()) {
        break;
      } else {
        text = new GraphText(String(min_date.getUTCFullYear()));
        text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      }
      break;
    case "day":
      if (min_date.getUTCFullYear() != max_date.getUTCFullYear()) {
        break;
      } else if (min_date.getUTCMonth() != max_date.getUTCMonth()) {
        text = new GraphText(String(min_date.getUTCFullYear()));
        text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      } else if (min_date.getUTCDate() != max_date.getUTCDate()) {
        text = new GraphText(`${min_date.getUTCFullYear()}/${min_date.getUTCMonth() + 1}`);
        text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      } else {
        text = new GraphText(`${min_date.getUTCFullYear()
                              }/${
                              min_date.getUTCMonth() + 1
                              }/${
                              min_date.getUTCDate()}`);
        text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      }
      break;
    case "hour":
      if (min_date.getUTCDate() == max_date.getUTCDate()) {
        text = new GraphText(`${min_date.getUTCFullYear()
                              }/${
                              min_date.getUTCMonth() + 1
                              }/${
                              min_date.getUTCDate()}`);
        text.init(this.scale_x, 0, this.scale_x.offset + Font_size);
      }
    }
  },

  get_x (x) {
    const w = this.frame.width;
    const min = this.min_x;
    const max = this.max_x;

    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      if (max <= 0 || min <= 0 || x <= 0) {
        return -1;
      }
      return w * (Math.log10(x) - Math.log10(min))
        / (Math.log10(max) - Math.log10(min));
    } else {
      return w * (x - min)/(max - min);
    }
  },

  get_data_x (x) {
    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      return Math.pow(10,
                      x / this.frame.width * (Math.log10(this.max_x) - Math.log10(this.min_x))
                      + Math.log10(this.min_x));
    } else {
      return this.min_x + (this.max_x - this.min_x) * x / this.frame.width;
    }
  },

  caption_y_auto_set_position (x) {
    if (! this.caption_y.moved) {
      const x0 = this.caption_y.get_x() + this.caption_y.get_width();
      const x1 = this.scale_y.offsetLeft + x;
      if (x1 < x0) {
        this.caption_y.x(this.caption_y.get_x() - (x0 - x1) - 10);
      }
    }
  },

  gauge_y () {
    let inc, d, j, start, l, n, m, diff, x;
    let str, text;

    if (this.min_y == this.max_y) {
      this.min_y -= 1;
      this.max_y += 1;
    } else if (this.min_y > this.max_y) {
      d = this.min_y;
      this.min_y = this.max_y;
      this.max_y = d;
    }

    m = Math.ceil(Math.log10(this.max_y - this.min_y));
    inc = Math.pow(10, m - 1);

    if ((this.max_y - this.min_y) / inc < 2) {
      inc /= 5;
      diff = 2;
    } else {
      diff = 1;
    }

    start = Math.ceil(this.min_y / inc);
    str = Math.abs(start * diff).toFixed(0);
    const len = str.length;

    m = this.max_y / inc;
    x = this.scale_y.offset;
    for (j = start; j <= m; j++) {
      str = (j * diff).toFixed(0);
      l = str.length;
      const decpt = 1 + (l - len);

      if (l > decpt) {
        str = `${str.substring(0, decpt)}.${str.substring(decpt, l)}`;
      }
      n = this.get_y(j * inc);
      text = new GraphText(String(str));
      text.init(this.scale_y, this.scale_y.offset, n);
      const x0 = this.scale_y.offset - text.get_width();
      text.x(x0);
      text.y(n - text.get_height() / 2);
      x = (x0 < x) ? x0 : x;
    }

    this.caption_y_auto_set_position(x);

    m = Math.floor(Math.log10(inc * (0.5 + Math.abs((start == 0)? 1: start))) * (1 + 2E-16));
    // "1 + 2E-16" exist for underflow

    if (m != 0) {
      text = new GraphText(`&times;10<sup>${m}</sup>`);
      text.init(this.scale_y, this.scale_y.offset - 40,  -30);
    }

    for (m = 1, d = start - 0.1; m < 10; m++, d -= 0.1) {
      n = this.get_y(d * inc);
      if (m == 5) {
        this.draw_gauge2_y(n);
      } else {
        this.draw_gauge3_y(n);
      }
    }

    for (; start <= this.max_y / inc; start++) {
      n = this.get_y(start * inc);
      this.draw_gauge1_y(n);
      for (m = 1, d = start + 0.1; m < 10; m++, d += 0.1) {
        n = this.get_y(d*inc);
        if (m == 5) {
          this.draw_gauge2_y(n);
        } else {
          this.draw_gauge3_y(n);
        }
      }
    }
  },

  get_y (y) {
    const h = this.frame.height;
    const min = this.min_y;
    const max = this.max_y;

    if (this.scale_y.type == 0) {
      return h * (1 - (y - min)/(max - min));
    } else {
      if (max <= 0 || min <= 0 || y <= 0) {
        return -1;
      }
      return h * (Math.log10(max) - Math.log10(y))
        / (Math.log10(max) - Math.log10(min));
    }
  },

  get_data_y (y) {
    if (this.scale_y.type == 0) {
      return this.min_y + (this.max_y - this.min_y)* (1 - y / this.frame.height);
    } else {
      return Math.pow(10,
                      Math.log10(this.max_y) - y / this.frame.height *
                      (Math.log10(this.max_y) - Math.log10(this.min_y)));
    }
  },

  gauge_log_x () {
    let i, m, x, n, inc, str, text;

    if (this.max_x <= 0 || this.min_x <= 0) {
      return;
    }

    const max = Math.log10(this.max_x);
    const min = Math.log10(this.min_x);
    if (max - min < 1) {
      this.gauge_x();
      return;
    } else if (max - min > 20) {
      inc = Math.ceil((max - min) / 10) + 1;
    } else {
      inc = 1;
    }

    for (i = Math.ceil(min); i < max; i += inc) {
      x = Math.pow(10, i);
      if (x > this.max_x) {
        break;
      }

      str = i.toFixed(0);
      n = this.get_x(x);
      text = new GraphText(`10<sup>${str}</sup>`);
      text.init(this.scale_x, n, this.scale_x.offset);
      text.x(n - text.get_width() / 2);
      this.draw_gauge1_x(n);
    }

    for (i = Math.floor(min); i < max; i += inc) {
      x = Math.pow(10, i);

      n = this.get_x(x);
      if (inc == 1) {
        for (m = 2; m < 10; m++) {
          n = this.get_x(x * m);
          if (m == 5) {
            this.draw_gauge2_x(n);
          } else {
            this.draw_gauge3_x(n);
          }
        }
      } else {
        for (m = 1; m <= inc; m++) {
          n = this.get_x(x *= 10);
          this.draw_gauge3_x(n);
        }
      }
    }
  },

  gauge_log_y () {
    let i, m, n, y, inc, x, str, text;

    if (this.max_y <= 0 || this.min_y <= 0) {
      return;
    }

    const max = Math.log10(this.max_y);
    const min = Math.log10(this.min_y);
    if (max - min < 1) {
      this.gauge_y();
      return;
    } else if (max - min > 20) {
      inc = Math.ceil((max - min) / 10) + 1;
    } else {
      inc = 1;
    }

    x = this.scale_y.offset;
    for (i = Math.ceil(min); i < max; i += inc) {
      y = Math.pow(10, i);
      if (y > this.max_y) {
        break;
      }

      str = i.toFixed(0);
      n = this.get_y(y);
      text = new GraphText(`10<sup>${str}</sup>`);
      text.init(this.scale_y, this.scale_y.offset, n - Font_size);
      const x0 = this.scale_y.offset - text.get_width();
      text.x(x0);
      this.draw_gauge1_y(n);
      x = (x0 < x) ? x0 : x;
    }

    this.caption_y_auto_set_position(x);

    for (i = Math.floor(min); i < max; i += inc) {
      y = Math.pow(10, i);

      n = this.get_y(y);
      if (inc == 1) {
        for (m = 2; m < 10; m++) {
          n = this.get_y(y * m);
          if (m == 5) {
            this.draw_gauge2_y(n);
          } else {
            this.draw_gauge3_y(n);
          }
        }
      } else {
        for (m = 1; m <= inc; m++) {
          n = this.get_y(y *= 10);
          this.draw_gauge3_y(n);
        }
      }
    }
    return;
  },

  restore_position() {
    const str = document.cookie.split(';').find(row => row.trim().startsWith(this.position_cookie));
    if (str === undefined) {
      return;
    }
    const pos = str.split(/[=:]/);
    this.parent_frame.style.left = `${pos[1]}px`;
    this.parent_frame.style.top = `${pos[2]}px`;
    this.parent_frame.style.width = `${pos[3]}px`;
    this.parent_frame.style.height = `${pos[4]}px`;
  },

  save_position(l, t, w, h) {
    document.cookie = `${this.position_cookie}=${l}:${t}:${w}:${h};max-age=31536000;SameSite=Strict;`;
  },

  update_position () {
    const parent_frame = this.parent_frame;
    const frame = this.frame;
    const width  = parseInt(parent_frame.style.width, 10);
    const height = parseInt(parent_frame.style.height, 10);
    const left   = parseInt(parent_frame.style.left, 10);
    const top    = parseInt(parent_frame.style.top, 10);

    frame.style.width = parent_frame.style.width;
    frame.style.height = parent_frame.style.height;
    frame.width = width;
    frame.height = height;

    this.move_to_center(this.title, left, width);
    this.title.y(top + this.title.text.offset_y);

    this.caption_y.x(left + this.caption_y.text.offset_x);
    this.caption_y.text.offset_y = (parseInt(frame.style.height, 10) - Font_size) / 2;
    this.caption_y.y(top  + this.caption_y.text.offset_y);

    this.move_to_center(this.caption_x, left, width);
    this.caption_x.y(top + height + this.caption_x.text.offset_y);

    this.scale_x.style.left = `${left}px`;
    this.scale_x.style.top  = `${top + height + this.scale_x.offset}px`;

    this.scale_y.style.left = `${left + this.scale_y.offset}px`;
    this.scale_y.style.top  = `${top}px`;

    this.legend.style.left = `${left + width + this.legend.offset_x}px`;
    this.legend.style.top = `${top + this.legend.offset_y}px`;

    this.graph.style.width = `${width + this.offset_x + this.margin_x}px`;
    this.graph.style.height = `${height + this.offset_y + this.margin_y}px`;

    this.save_position(left, top, width, height);
  },

  set_size (w, h) {
    this.parent_frame.style.width = `${w}px`;
    this.parent_frame.style.height = `${h}px`;
    this.update_position();
  },

  move_to_center(obj, left, width) {
    if (! obj.moved) {
      const w = obj.get_width();
      obj.x(left + (width - w) / 2);
    } else {
      obj.x(left + obj.text.offset_x);
    }
  },

  clear () {
    let node;

    node = this.scale_x.childNodes;
    while (node.length > 0) {
      this.scale_x.removeChild(node[0]);
    }

    node = this.scale_y.childNodes;
    while (node.length > 0) {
      this.scale_y.removeChild(node[0]);
    }

    node = this.legend;
    while (node.rows.length > 0) {
      node.deleteRow(0);
    }

    this.canvas.clearRect(0, 0, this.frame.width, this.frame.height);
  },

  draw () {
    document.body.style.cursor='wait';
    this.clear();
    this.update_position();
    switch (this.scale_x.type) {
    case this.SCALE_TYPE_LINEAR:
      this.gauge_x();
      break;
    case this.SCALE_TYPE_LOG:
      this.gauge_log_x();
      break;
    case this.SCALE_TYPE_UNIX:
    case this.SCALE_TYPE_MJD:
      this.gauge_date_x();
      break;
    }
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      this.gauge_log_y();
    } else {
      this.gauge_y();
    }
    this.draw_data();
    document.body.style.cursor='auto';
    if (this.draw_event_listner) {
      this.draw_event_listner(this);
    }
  },

  set_draw_event_listner (func) {
    this.draw_event_listner = func;
  },

  scale_x_type (type) {
    switch (type) {
    case "linear":
      this.scale_x.type = this.SCALE_TYPE_LINEAR;
      break;
    case "log":
      this.scale_x.type = this.SCALE_TYPE_LOG;
      break;
    case "unix":
      this.scale_x.type = this.SCALE_TYPE_UNIX;
      break;
    case "mjd":
      this.scale_x.type = this.SCALE_TYPE_MJD;
      break;
    default:
      this.scale_x.type = this.SCALE_TYPE_LINEAR;
    }
  },

  scale_y_type (type) {
    if (type == "log") {
      this.scale_y.type = this.SCALE_TYPE_LOG;
    } else {
      this.scale_y.type = this.SCALE_TYPE_LINEAR;
    }
  },

  zoom_out_x () {
    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      this.min_x /= this.zoom_ratio;
      this.max_x *= this.zoom_ratio;
    } else {
      const w = (this.max_x - this.min_x) * (this.zoom_ratio - 1) / 2;
      this.min_x -= w;
      this.max_x += w;
    }
  },

  zoom_out_y () {
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      this.min_y /= this.zoom_ratio;
      this.max_y *= this.zoom_ratio;
    } else {
      const h = (this.max_y - this.min_y) * (this.zoom_ratio - 1) / 2;
      this.min_y -= h;
      this.max_y += h;
    }
  },

  zoom_out () {
    this.zoom_out_x();
    this.zoom_out_y();
  },

  zoom_in_x () {
    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      this.min_x *= this.zoom_ratio;
      this.max_x /= this.zoom_ratio;
    } else {
      const w = (this.max_x - this.min_x) * (1 - 1 / this.zoom_ratio) / 2;
      this.min_x += w;
      this.max_x -= w;
    }
  },

  zoom_in_y () {
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      this.min_y *= this.zoom_ratio;
      this.max_y /= this.zoom_ratio;
    } else {
      const h = (this.max_y - this.min_y) * (1 - 1 / this.zoom_ratio) / 2;
      this.min_y += h;
      this.max_y -= h;
    }
  },

  zoom_in () {
    this.zoom_in_x();
    this.zoom_in_y();
  },

  set_scale (minx, miny, maxx, maxy) {
    if (minx) {
      this.min_x = minx;
    }
    if (maxx) {
      this.max_x = maxx;
    }
    if (miny) {
      this.min_y = miny;
    }
    if (maxy) {
      this.max_y = maxy;
    }
  },

  centering (x, y) {
    let w, h, minx, maxx, miny, maxy;
    if (this.scale_x.type == this.SCALE_TYPE_LOG) {
      w = Math.sqrt(this.max_x / this.min_x);
      minx = x / w;
      maxx = x * w;
    } else {
      w = this.max_x - this.min_x;
      minx = x - w / 2;
      maxx = x + w / 2;
    }
    if (this.scale_y.type == this.SCALE_TYPE_LOG) {
      h = Math.sqrt(this.max_y / this.min_y);
      miny = y / h;
      maxy = y * h;
    } else {
      h = this.max_y - this.min_y;
      miny = y - h / 2;
      maxy = y + h / 2;
    }
    this.set_scale(minx, miny, maxx, maxy);
  },

  async load_data(file, i) {
    const data = new Data();
    const color = self.Colors[i % self.Colors.length];
    self.add_data(data);
    data.set_color(color);
    data.set_style(self.Style);
    data.set_text(file);
    await data.load(file, self.X, self.Y, self.FS, self.RS);
    self.title.set_text(`Data loading... [${i + 1}]`);
    return data;
  },

  async load(...args) {
    const self = this, title = this.title.get_text();
    const promise = args.map((file, i) => self.load_data(file, i));
    await Promise.all(promise);
    self.title.set_text(title);
    self.autoscale();
    self.draw();
  }
};

/**********************************************************************
Definition of Data Object.
***********************************************************************/
function Data() {
  this.color = '#000000';
  this.size  = 6;
  this.data = new Array(0);
  this.min_x = 0;
  this.max_x = 1;
  this.min_y = 0;
  this.max_y = 1;
  this.draw = false;
  this.caption = null;
  this.width = 2;
  this.style = "c";
  this.loaded = false;
  this.maxDataNum = -1;
}

Data.prototype = {
  length () {
    return this.data.length;
  },

  clear () {
    this.min_x = 0;
    this.max_x = 1;
    this.min_y = 0;
    this.max_y = 1;
    this.data.length = 0;
  },

  add_data (x, y) {
    if (!isFinite(x) || !isFinite(y)) {
      return;
    }
    if (this.data.length < 1) {
      this.min_x = x;
      this.max_x = x;
      this.min_y = y;
      this.max_y = y;
      this.draw = true;
    } else {
      if (x < this.min_x) {
        this.min_x = x;
      } else if (x > this.max_x) {
        this.max_x = x;
      }

      if (y < this.min_y) {
        this.min_y = y;
      } else if (y > this.max_y) {
        this.max_y = y;
      }
    }
    this.data.push([x, y]);
    if (this.maxDataNum > 0 && this.data.length > this.maxDataNum) {
      this.data.shift();
    }
  },

  str2data (s, sep1, sep2) {
    /* this function is obsolete */
    const data = s.split(sep1);

    data.forEach(di => {
      const xy_data = di.split(sep2);
      if (xy_data.length > 1) {
        this.add_data(parseFloat(xy_data[0]), parseFloat(xy_data[1]));
      }
    });
  },

  read_data (...args) {
    let m, x, y, col_x = 0, col_y = 1, rs = "\n", fs = /[ ,\t]+/;

    switch (args.length) {
    case 5:
      rs = args[4];
      // fallthrough
    case 4:
      fs = args[3];
      // fallthrough
    case 3:
      col_y = parseInt(args[2], 10) - 1;
      col_x = parseInt(args[1], 10) - 1;
      break;
    }
    const data = args[0].split(rs);

    x = col_x;
    y = col_y;

    data.forEach (di => {
      const xy_data = di.split(fs);
      m = xy_data.length;

      if (col_x < 0) {
        x = col_x + m + 1;
      }

      if (col_y < 0) {
        y = col_y + m + 1;
      }

      if (xy_data.length > 1) {
        const fx = parseFloat(xy_data[x]);
        const fy = parseFloat(xy_data[y]);
        if (! Number.isNaN(fx) && ! Number.isNaN(fy)) {
          this.add_data(fx, fy);
        }
      }
    });
  },

  async load (...arg) {
    const self = this;
    const path = arg[0];
    const args = arg.concat();
    this.loaded = false;

    const response = await fetch(path, {cache: 'no-cache'});
    const text = await response.text()
    args[0] = text;
    self.read_data(...args);
    self.loaded = true;
    return self
  },

  wait(cb) {
    const data = this;
    const wait_until_data_loaded = function () {
      if (data.loaded) {
        cb();
        return;
      } else {
        window.setTimeout(wait_until_data_loaded, 100);
      }
    }
    wait_until_data_loaded();
  },

  autoscale () {
    const minmax = {
      minx: Infinity,
      maxx: -Infinity,
      miny: Infinity,
      maxy: -Infinity,
    };

    if (this.data.length < 1) {
      this.draw = false;
      return;
    }

    this.data.reduce((mm, element) => {
      if (! isFinite(element[0]) || ! isFinite(element[1])) {
        return mm;
      }
      if (element[0] < mm.minx) {
        mm.minx = element[0];
      }
      if (element[0] > mm.maxx) {
        mm.maxx = element[0];
      }

      if (element[1] < mm.miny) {
        mm.miny = element[1];
      }
      if (element[1] > mm.maxy) {
        mm.maxy = element[1];
      }
      return mm;
    }, minmax);

    if (! isFinite(minmax.minx) || ! isFinite(minmax.maxx) || ! isFinite(minmax.miny) || ! isFinite(minmax.maxy)) {
      minmax.minx = 0;
      minmax.maxx = 0;
      minmax.miny = 0;
      minmax.maxy = 0;
      this.draw = false;
    }

    this.min_x = minmax.minx;
    this.max_x = minmax.maxx;
    this.min_y = minmax.miny;
    this.max_y = minmax.maxy;
  },

  set_text (s) {
    this.caption = s;
  },

  set_color (s) {
    this.color = s;
  },

  set_style (s) {
    this.style = s;
  },

  set_line_width (w) {
    this.width = w;
  },

  set_mark_size (s) {
    this.size = s;
  },

  map (cb) {
    return this.data.map(cb);
  },

  forEach (cb) {
    this.data.forEach(cb);
  },

  reduce (cb, initialValue) {
    return this.data.reduce(cb, initialValue);
  },
};
