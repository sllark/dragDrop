let canvas = new fabric.Canvas('c');
let rooms = [];
let img;


const textConfigs = {
    fontFamily: 'Calibri',
    fontSize: 12,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    fill: '#fff',
    selectable: true
};

window.onload = init;

function deleteObject(e, fabricObject, controls) {

    let canvas = fabricObject.canvas;

    if (fabricObject.data.isSelected) {
        fabricObject.moveTo(fabricObject.data.indexBeforeSelecting);
        fabricObject.off('deselected');
        canvas.requestRenderAll();
    }


    let removed = null
    if (fabricObject.data.type === 'room') {
        removed = rooms.splice(rooms.indexOf(fabricObject), 1)[0];
    } else if (fabricObject.data.type !== 'room' && fabricObject.data.containerEle) {
        // if an element is removed then reset its Container/Parent element's data

        let container = fabricObject.data.containerEle;
        let index = container.data.childs.indexOf(fabricObject);
        container.data.childs.splice(index, 1);
    }


    canvas.getObjects().forEach(obj => {

        if (removed && obj.data.type === 'room') { //if a room is removed then reset the text of all other rooms

            let objIndexInRooms = rooms.indexOf(obj);
            obj._objects[1].set('text', 'Room ' + (objIndexInRooms + 1));
            obj.data.num = objIndexInRooms + 1;

        }
        if (obj.data.containerEle === fabricObject) { // if element is in a room and that room is being removed then reset the element

            setInteriorData(obj, null);//reset data
        }
    })

    canvas.remove(fabricObject);
    canvas.requestRenderAll();
}

function init() {

    img = document.createElement('img');
    img.src = 'images/icons/remove.svg';

    canvas.selection = false;
    canvas.preserveObjectStacking = true;
    fabric.Object.prototype.data = {}

    fabric.controlRenderers.renderIcon = function (ctx, left, top, styleOverride, fabricObject) {
        var size = this.cornerSize;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();

    }


    fabric.Object.prototype.controls.deleteControl = new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetY: 30,
        cursorStyle: 'pointer',
        mouseUpHandler: deleteObject,
        // actionName: "rotate",
        // actionHandler:fabric.controlHandlers.rotationWithSnapping,
        render: fabric.controlRenderers.renderIcon,
        cornerSize: 24
    })

    fabric.Object.prototype.controls.mtr.render = fabric.controlRenderers.renderCircleControl;
    fabric.Object.prototype.controls.mtr.cornerSize = 40;
    fabric.Object.prototype.controls.mtr.cursorStyle = "url('images/icons/rotate.svg'), auto";


    var bg = new fabric.Rect({width: 700, height: 599, fill: '', opacity: 0.7, evented: false, selectable: false});

    bg.fill = new fabric.Pattern({source: './images/bg_1_fill_clear.png'},
        function () {
            bg.dirty = true;
            canvas.requestRenderAll()
        });
    canvas.backgroundImage = bg;

    canvas.on('drop', eleDropHandler)

    addRoom();
}

function addRoom() {


    let room = new fabric.Rect({
        width: 400,
        height: 400,
        fill: '#8d7769',
        originX: 'center',
        originY: 'center',
        stroke: 'lightgreen',
        strokeWidth: 4,
    });


    var t = new fabric.Text('Room ' + (rooms.length + 1), textConfigs);

    var g = new fabric.Group([room, t], {
        top: 100, left: 150
    });


    g.data = {
        type: 'room',
        num: rooms.length + 1,
        inContainer: false,
        isContainer: true,
        container: g,
        childs: []
    }

    canvas.add(g);


    g.on('mousedown', handleSelected);
    g.on('deselected', (e) => {

        if (g.data.isSelected) {
            g.moveTo(g.data.indexBeforeSelecting);
            g.data.indexBeforeSelecting = null;
            g.data.isSelected = false;
        }

    });

    g.on('rotate', (e) => {
        e.target.data.childs.forEach(ele => {
            ele.set('angle', (g.get('angle') - ele.data.parentPreAngle) + ele.get('angle'))
            ele.data.parentPreAngle = g.get('angle');
            ele.data.parentPrevLeft = g.get('left');
            ele.data.parentPrevTop = g.get('top');
        })


    })

    g.on('scaled', (e) => {
        e.target.data.childs.forEach(ele => {
            ele.data.parentPrevLeft = g.get('left');
            ele.data.parentPrevTop = g.get('top');
        })
    })


    let prevRoomIndex = -1;
    canvas.getObjects().forEach((obj, index) => {
        if (obj.data.type === 'room') {
            obj.moveTo(prevRoomIndex + 1);
            prevRoomIndex = index;
            // console.log(obj.data.type, index)
        }
    })

    rooms.push(g);

    return g;

}

function createInterior(refEle, config, loc, temp) {

    let interior, t;

    if (config.type === 'table') {
        t = new fabric.Text('Table', textConfigs);
        interior = new fabric.Rect({
            width: 70, height: 70, fill: '#6100c2', originX: 'center',
            originY: 'center',
        });
    } else if (config.type === 'bed') {

        t = new fabric.Text('Bed', textConfigs);
        interior = new fabric.Rect({
            width: 80, height: 120, fill: '#00c29e', originX: 'center',
            originY: 'center',
        });
    } else if (config.type === 'chair') {

        t = new fabric.Text('Chair', textConfigs);
        interior = new fabric.Rect({
            width: 45, height: 55, fill: '#008bc2', originX: 'center',
            originY: 'center',
        });
    } else if (config.type === 'circle') {

        t = new fabric.Text('Circle', textConfigs);
        interior = new fabric.Circle({
            radius: 30, fill: '#41d502', originX: 'center', originY: 'center',
        });
    }


    let g = new fabric.Group([interior, t], {top: loc.y, left: loc.x});
    g.data = config;

    setInteriorData(g, refEle);

    g.on('mouseup', (e) => {
        for (let i = 0; i < rooms.length; i++) {
            let room = rooms[i];

            if (e.target.intersectsWithObject(room)) { // if element intercets a room;
                if (!e.target.data.movingWithParent) { // if element interceting room was outside of room before;
                    setInteriorData(e.target, room);
                }
            } else {
                if (e.target.data.movingWithParent) {
                    setInteriorData(e.target, null); // reset all data of current interior element
                    room.off('moving'); //removes move event; it removes 'moving' event of rooms from all other elements
                }


                //adds 'moving' event to room for all elements that are within this room.
                let allObjects = canvas.getObjects();
                allObjects.forEach(obj => {
                    if (obj.data.movingWithParent && obj.data.containerEle === room) {
                        room.on('moving', (e) => moveChildAlong(e, obj));
                    }
                })
            }
        }
    })

    canvas.add(g)

    return g;
}

function moveChildAlong(e, g) {

    let left = Number(g.get('left')) + (e.target.left - g.data.parentPrevLeft);
    let top = Number(g.get('top')) + (e.target.top - g.data.parentPrevTop);


    g.set({left, top});
    g.setCoords();


    g.data.parentPrevLeft = e.target.left;
    g.data.parentPrevTop = e.target.top;

}

function handleSelected(e) {

    let roomLastIndex = -1;
    canvas.getObjects().forEach(obj => {
        if (obj.data.type === 'room')
            roomLastIndex++;
    });

    e.target.data.indexBeforeSelecting = canvas.getObjects().indexOf(e.target);
    e.target.data.isSelected = true;
    e.target.moveTo(roomLastIndex);

    // console.log(e.transform.target._objects[1].text='rooo');

}

function handleUnselected(e) {

    // console.log('unselected');
    // e.target.data.isSelected=false;

    // e.target.moveTo(e.target.data.indexBeforeSelecting);
    // e.target.data.indexBeforeSelecting=null;


}

function setInteriorData(ele, room = null) {

    ele.data.movingWithParent = !!room;
    ele.data.containerEle = room ? room : null;
    ele.data.parentPrevLeft = room ? room.get('left') : null;
    ele.data.parentPrevTop = room ? room.get('top') : null;
    ele.data.parentPreAngle = room ? room.get('angle') : null;
    ele.data.inContainer = !!room;


    if (!!room) {
        room.data.childs.push(ele);
        room.on('moving', (e) => moveChildAlong(e, ele));
    }


}


function eleDropHandler(e) {

    var catType = e.e.dataTransfer.getData("text"),
        {x, y} = e.e,
        pEle;


    if (!!(e.target && e.target.data))
        pEle = e.target.data.isContainer ? e.target.data.container : e.target.data.containerEle;
    else
        pEle = null;


    if (catType === 'table') {

        createInterior(pEle,
            {type: 'table', inContainer: !!pEle, container: false},
            {x, y});


    } else if (catType === 'bed') {
        createInterior(pEle,
            {type: 'bed', inContainer: !!pEle, container: false},
            {x, y});

    } else if (catType === 'room') {
        addRoom();
    }
    else if (catType === 'chair') {

        createInterior(pEle,
            {type: 'chair', inContainer: !!pEle, container: false},
            {x, y});
    }
    else if (catType === 'circle') {

        createInterior(pEle,
            {type: 'circle', inContainer: !!pEle, container: false},
            {x, y});


    }

}


// canvas.on('mouse:wheel', function(opt) {
//     var delta = opt.e.deltaY;
//     var zoom = canvas.getZoom();
//     zoom *= 0.999 ** delta;
//     if (zoom > 20) zoom = 20;
//     if (zoom < 0.01) zoom = 0.01;
//     canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
//     opt.e.preventDefault();
//     opt.e.stopPropagation();
//     var vpt = this.viewportTransform;
//     if (zoom < 0.4) {
//         vpt[4] = 200 - 1000 * zoom / 2;
//         vpt[5] = 200 - 1000 * zoom / 2;
//     } else {
//         if (vpt[4] >= 0) {
//             vpt[4] = 0;
//         } else if (vpt[4] < canvas.getWidth() - 1000 * zoom) {
//             vpt[4] = canvas.getWidth() - 1000 * zoom;
//         }
//         if (vpt[5] >= 0) {
//             vpt[5] = 0;
//         } else if (vpt[5] < canvas.getHeight() - 1000 * zoom) {
//             vpt[5] = canvas.getHeight() - 1000 * zoom;
//         }
//     }
// });


// fabric.Control.prototype.render=function (ctx, left, top, styleOverride, fabricObject) {
//     console.log(fabricObject)
//     styleOverride = styleOverride || {};
//     switch (styleOverride.cornerStyle || fabricObject.cornerStyle) {
//         case 'circle':
//             fabric.controlRenderers.renderCircleControl.call(this, ctx, left, top, styleOverride, fabricObject);
//             break;
//         default:
//             fabric.controlRenderers.renderSquareControl.call(this, ctx, left, top, styleOverride, fabricObject);
//
//
//     }
// }

// fabric.Object.prototype.drawControls = function (ctx, styleOverride) {
//     styleOverride = styleOverride || {};
//
//
//     ctx.save();
//     ctx.setTransform(this.canvas.getRetinaScaling(), 0, 0, this.canvas.getRetinaScaling(), 0, 0);
//     ctx.strokeStyle = ctx.fillStyle = styleOverride.cornerColor || this.cornerColor;
//     if (!this.transparentCorners) {
//         ctx.strokeStyle = styleOverride.cornerStrokeColor || this.cornerStrokeColor;
//     }
//     this._setLineDash(ctx, styleOverride.cornerDashArray || this.cornerDashArray, null);
//
//
//     console.dir(fabric.Object.prototype);
//
//     this.setCoords();
//     this.forEachControl(function (control, key, fabricObject) {
//         if (control.getVisibility(fabricObject, key)) {
//             // this.cursorStyle='pointer';
//
//             // control.prototype.cursorStyle='pointer';
//             control.render(ctx,
//                 fabricObject.oCoords[key].x,
//                 fabricObject.oCoords[key].y, styleOverride, fabricObject);
//
//             // this._drawControl('tr', ctx, methodName,
//             //     left + width,
//             //     top, styleOverride);
//             //
//
//         }
//     });
//     ctx.restore();
//
//     return this;
// }


// fabric.Object.prototype.drawControls = function (ctx, styleOverride) {
//     styleOverride = styleOverride || {};
//     var wh = this._calculateCurrentDimensions(),
//         width = wh.x,
//         height = wh.y,
//         scaleOffset = styleOverride.cornerSize || this.cornerSize,
//         left = -(width + scaleOffset) / 2,
//         top = -(height + scaleOffset) / 2,
//         transparentCorners = typeof styleOverride.transparentCorners !== 'undefined' ?
//             styleOverride.transparentCorners : this.transparentCorners,
//         hasRotatingPoint = typeof styleOverride.hasRotatingPoint !== 'undefined' ?
//             styleOverride.hasRotatingPoint : this.hasRotatingPoint,
//         methodName = transparentCorners ? 'stroke' : 'fill';
//     ctx.save();
//     ctx.strokeStyle = ctx.fillStyle = styleOverride.cornerColor || this.cornerColor;
//     if (!this.transparentCorners) {
//         ctx.strokeStyle = styleOverride.cornerStrokeColor || this.cornerStrokeColor;
//     }
//     this._setLineDash(ctx, styleOverride.cornerDashArray || this.cornerDashArray, null);
//     // top-left
//     const cancel = new Image()
//     cancel.src = 'https://upload.wikimedia.org/wikipedia/commons/6/65/Crystal_button_cancel.svg'
//     ctx.drawImage(cancel, left, top, this.cornerSize, this.cornerSize)
//     // top-right
//     this._drawControl('tr', ctx, methodName,
//         left + width,
//         top, styleOverride);
//     // bottom-left
//     this._drawControl('bl', ctx, methodName,
//         left,
//         top + height, styleOverride);
//     // bottom-right
//     this._drawControl('br', ctx, methodName,
//         left + width,
//         top + height, styleOverride);
//     if (!this.get('lockUniScaling')) {
//         // middle-top
//         this._drawControl('mt', ctx, methodName,
//             left + width / 2,
//             top, styleOverride);
//         // middle-bottom
//         this._drawControl('mb', ctx, methodName,
//             left + width / 2,
//             top + height, styleOverride);
//         // middle-right
//         this._drawControl('mr', ctx, methodName,
//             left + width,
//             top + height / 2, styleOverride);
//         // middle-left
//         this._drawControl('ml', ctx, methodName,
//             left,
//             top + height / 2, styleOverride);
//     }
//     // middle-top-rotate
//     if (hasRotatingPoint) {
//         this._drawControl('mtr', ctx, methodName,
//             left + width / 2,
//             top - this.rotatingPointOffset, styleOverride);
//     }
//     ctx.restore();
//     return this;
// },
